from flask import Flask, request, jsonify, render_template
from flask import send_from_directory
import xml.etree.ElementTree as ET
import difflib
import re
import os
import logging
import pandas as pd
import io
import json
from collections import defaultdict
from datetime import datetime
import json
from deepdiff import DeepDiff

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)


def clean_and_format_xml(xml_string):
    # Remove content before and after TrdCaptRpt tags
    pattern = r'<TrdCaptRpt.*?</TrdCaptRpt>'
    match = re.search(pattern, xml_string, re.DOTALL)
    if match:
        xml_string = match.group(0)

    # Parse the XML
    root = ET.fromstring(xml_string)

    # Helper function to recursively build the formatted XML string
    def format_element(elem, level=0):
        result = "  " * level + f"<{elem.tag}"
        for key, value in sorted(elem.attrib.items()):
            result += f' {key}="{value}"'
        if len(elem) == 0 and not elem.text:
            result += "/>\n"
        else:
            result += ">\n"
            for child in sorted(elem, key=lambda x: x.tag):
                result += format_element(child, level + 1)
            if elem.text and elem.text.strip():
                result += "  " * (level + 1) + elem.text.strip() + "\n"
            result += "  " * level + f"</{elem.tag}>\n"
        return result

    # Format the XML
    formatted_xml = format_element(root)

    return formatted_xml.strip()


def parse_fixml_file(xml_string):
    cleaned_xml = clean_and_format_xml(xml_string)
    root = ET.fromstring(cleaned_xml)
    return extract_fields(root), cleaned_xml


def extract_fields(element, prefix=''):
    fields = {}
    tag = element.tag.split('}')[-1]  # Remove namespace if present
    new_prefix = f"{prefix}/{tag}" if prefix else tag
    for attr, value in element.attrib.items():
        fields[f"{new_prefix}/@{attr}"] = value
    for child in element:
        fields.update(extract_fields(child, new_prefix))
    return fields


def compare_fixml_files(xml_string1, xml_string2):
    fields1, cleaned_xml1 = parse_fixml_file(xml_string1)
    fields2, cleaned_xml2 = parse_fixml_file(xml_string2)

    only_in_1 = sorted(set(fields1.keys()) - set(fields2.keys()))
    only_in_2 = sorted(set(fields2.keys()) - set(fields1.keys()))
    different_values = sorted(
        (key, fields1[key], fields2[key])
        for key in set(fields1.keys()) & set(fields2.keys())
        if fields1[key] != fields2[key]
    )

    return only_in_1, only_in_2, different_values, cleaned_xml1, cleaned_xml2


def generate_diff(xml_string1, xml_string2):
    lines1 = xml_string1.splitlines()
    lines2 = xml_string2.splitlines()

    differ = difflib.Differ()
    diff = list(differ.compare(lines1, lines2))

    return diff


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/fixml_comparison')
def fixml_comparison():
    return render_template('fixml_comparison.html')


@app.route('/compare', methods=['POST'])
def compare():
    app.logger.debug("Comparison request received")

    file1 = request.files['file1']
    file2 = request.files['file2']

    app.logger.debug(f"File 1: {file1.filename}, File 2: {file2.filename}")

    xml_string1 = file1.read().decode('utf-8')
    xml_string2 = file2.read().decode('utf-8')

    app.logger.debug("Files read successfully")

    only_in_1, only_in_2, different_values, cleaned_xml1, cleaned_xml2 = compare_fixml_files(xml_string1, xml_string2)
    diff = generate_diff(cleaned_xml1, cleaned_xml2)

    app.logger.debug(
        f"Comparison completed. Only in 1: {len(only_in_1)}, Only in 2: {len(only_in_2)}, Different values: {len(different_values)}")

    result = {
        'file1_name': file1.filename,
        'file2_name': file2.filename,
        'only_in_1': only_in_1,
        'only_in_2': only_in_2,
        'different_values': [
            {
                'field': key,
                'value1': value1,
                'value2': value2
            }
            for key, value1, value2 in different_values
        ],
        'xml1': cleaned_xml1,
        'xml2': cleaned_xml2,
        'diff': diff
    }

    app.logger.debug("Sending response")
    return jsonify(result)


@app.route('/filter_unique_values', methods=['POST'])
def filter_unique_values():
    data = request.json
    different_values = data['different_values']

    # Fields to remove when "Remove Unique Values" is selected
    unique_fields = ['TrdCaptRpt/@TrdID', 'TrdCaptRpt/@TrdID2', 'TrdCaptRpt/@RptID', 'TrdCaptRpt/@MtchId',
                     'TrdCaptRpt/@LastUpdateTm', 'TrdCaptRpt/@TxnTm', 'TrdCaptRpt/@BizDt',
                     'TrdCaptRpt/@TrdDt', ]

    filtered_values = [item for item in different_values if item['field'] not in unique_fields]

    return jsonify(filtered_values)


@app.route('/cdo_comparison')
def cdo_comparison():
    return render_template('cdo_comparison.html')


@app.route('/upload_cdo', methods=['POST'])
def upload_cdo():
    df1, file1_name = get_dataframe('file1', 'csvTextA', 'File A')
    df2, file2_name = get_dataframe('file2', 'csvTextB', 'File B')

    if df1.empty or df2.empty:
        return jsonify({'error': 'One or both data sources are empty'}), 400

    # Get all columns except the first one (CDO field), preserving order
    columns = list(df1.columns[1:])

    return jsonify({
        'columns': columns,
        'file1_name': file1_name,
        'file2_name': file2_name
    })


@app.route('/compare_cdo', methods=['POST'])
def compare_cdo():
    df1, file1_name = get_dataframe('file1', 'csvTextA', 'File A')
    df2, file2_name = get_dataframe('file2', 'csvTextB', 'File B')
    selected_columns = request.form.get('columns')

    if selected_columns:
        selected_columns = json.loads(selected_columns)
    else:
        selected_columns = list(df1.columns[1:])  # All columns except the first (CDO field)

    if df1.empty or df2.empty:
        return jsonify({
            'error': 'One or both of the data sources are empty. Please ensure both sources contain valid data.'
        }), 400

    try:
        matched_values, mismatched_values, only_in_a, only_in_b, duplicate_fields = compare_dataframes(df1, df2,
                                                                                                       selected_columns)

        # Sort the results alphabetically
        matched_values.sort(key=lambda x: x['CDO_Field'])
        mismatched_values.sort(key=lambda x: x['CDO_Field'])
        only_in_a.sort()
        only_in_b.sort()

    except Exception as e:
        app.logger.error(f"Error in compare_dataframes: {str(e)}")
        return jsonify({
            'error': 'An error occurred while comparing the dataframes. Please check your data and try again.'
        }), 500

    return jsonify({
        'matched_values': matched_values,
        'mismatched_values': mismatched_values,
        'only_in_a': only_in_a,
        'only_in_b': only_in_b,
        'duplicate_fields': duplicate_fields,
        'file1_name': file1_name,
        'file2_name': file2_name
    })


def get_dataframe(file_key, text_key, default_name):
    if file_key in request.files and request.files[file_key].filename != '':
        file = request.files[file_key]
        return pd.read_csv(file, keep_default_na=False), file.filename
    elif text_key in request.form and request.form[text_key].strip() != '':
        return pd.read_csv(io.StringIO(request.form[text_key]), keep_default_na=False), default_name
    else:
        return pd.DataFrame(), default_name


def compare_dataframes(df1, df2, columns):
    matched_values = []
    mismatched_values = []
    only_in_a = []
    only_in_b = []
    duplicate_fields = defaultdict(int)

    if df1.empty or df2.empty:
        raise ValueError("One or both dataframes are empty")

    if len(df1.columns) == 0 or len(df2.columns) == 0:
        raise ValueError("One or both dataframes have no columns")

    cdo_field = df1.columns[0]  # Assume the first column is always the CDO field

    # Check for duplicates in both dataframes
    for df in [df1, df2]:
        duplicate_counts = df[cdo_field].value_counts()
        for field, count in duplicate_counts[duplicate_counts > 1].items():
            duplicate_fields[field] += count

    # Create dictionaries for easier lookup, keeping all occurrences
    df1_dict = df1.groupby(cdo_field, group_keys=False).apply(lambda x: x.to_dict('records')).to_dict()
    df2_dict = df2.groupby(cdo_field, group_keys=False).apply(lambda x: x.to_dict('records')).to_dict()

    all_cdo_fields = set(df1_dict.keys()) | set(df2_dict.keys())

    for field in all_cdo_fields:
        if field in df1_dict and field in df2_dict:
            rows1 = df1_dict[field]
            rows2 = df2_dict[field]

            # Compare all occurrences
            for i in range(max(len(rows1), len(rows2))):
                row1 = rows1[i] if i < len(rows1) else {}
                row2 = rows2[i] if i < len(rows2) else {}

                mismatches = {}
                values = {}
                for col in columns:
                    val1 = row1.get(col, '')
                    val2 = row2.get(col, '')
                    if val1 != val2:
                        mismatches[col] = {'A': val1, 'B': val2}
                    values[col] = {'A': val1, 'B': val2}

                if mismatches:
                    mismatched_values.append({'CDO_Field': field, 'mismatches': mismatches})
                else:
                    matched_values.append({'CDO_Field': field, 'values': values})

        elif field in df1_dict:
            only_in_a.append(field)
        else:
            only_in_b.append(field)

    return matched_values, mismatched_values, only_in_a, only_in_b, dict(duplicate_fields)


@app.route('/revision_history')
def revision_history():
    return render_template('revision_history_generator.html')


@app.route('/generate_revision_history', methods=['POST'])
def generate_revision_history():
    file_a = request.files['fileA']
    file_b = request.files['fileB']

    df_a = pd.read_csv(file_a)
    df_b = pd.read_csv(file_b)

    revision_history = []

    # Compare columns
    columns_a = set(df_a.columns)
    columns_b = set(df_b.columns)

    removed_columns = columns_b - columns_a
    added_columns = columns_a - columns_b

    # Only add column changes if there are actual named columns added or removed
    if removed_columns:
        named_removed = [col for col in removed_columns if not col.startswith('Unnamed:')]
        if named_removed:
            revision_history.append(f"Removed columns: {', '.join(named_removed)}")

    if added_columns:
        named_added = [col for col in added_columns if not col.startswith('Unnamed:')]
        if named_added:
            revision_history.append(f"Added columns: {', '.join(named_added)}")

    # Use the first column as the impact field
    impact_field = df_a.columns[0]

    # Compare content
    fields_a = set(df_a[impact_field])
    fields_b = set(df_b[impact_field])

    new_fields = fields_a - fields_b
    removed_fields = fields_b - fields_a

    if new_fields:
        revision_history.append("Added the following fields:")
        for field in sorted(new_fields):
            revision_history.append(f"- {field}")
        revision_history.append("")  # Add an empty line for spacing

    if removed_fields:
        revision_history.append("Removed the following fields:")
        for field in sorted(removed_fields):
            revision_history.append(f"- {field}")
        revision_history.append("")  # Add an empty line for spacing

    # Compare changes in existing fields
    common_fields = fields_a.intersection(fields_b)
    field_changes = defaultdict(list)

    for field in common_fields:
        row_a = df_a[df_a[impact_field] == field].iloc[0]
        row_b = df_b[df_b[impact_field] == field].iloc[0]

        for col in df_a.columns[1:]:  # Skip the impact field
            if col in df_b.columns:
                val_a, val_b = row_a[col], row_b[col]
                if pd.notna(val_a) and pd.notna(val_b) and val_a != val_b:
                    field_changes[col].append(f"- {field}: {val_b} -> {val_a}")

    # Add changes to revision history
    for col, changes in field_changes.items():
        if changes:
            revision_history.append(f"Updated the {col} of the following fields:")
            revision_history.extend(changes)
            revision_history.append("")  # Add an empty line for spacing

    # Combine all changes into a single entry
    if revision_history:
        revision_entries.append({
            "date": datetime.now().strftime("%d-%m-%Y"),
            "description": "\n".join(revision_history),
            "author": "",
            "tickets": ""
        })
    else:
        revision_entries.append({
            "date": datetime.now().strftime("%d-%m-%Y"),
            "description": "No changes detected between the two versions.",
            "author": "",
            "tickets": ""
        })

    return jsonify({
        'revision_history': revision_entries
    })


revision_entries = []


@app.route('/cdo_json_comparison')
def cdo_json_comparison():
    return render_template('cdo_json_comparison.html')


def get_all_paths(obj, parent_path=''):
    """Recursively get all paths in a nested dictionary using dot notation"""
    paths = []
    if isinstance(obj, dict):
        for key, value in obj.items():
            current_path = f"{parent_path}.{key}" if parent_path else key
            paths.append(current_path)
            if isinstance(value, (dict, list)):
                paths.extend(get_all_paths(value, current_path))
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            current_path = f"{parent_path}[{i}]"
            if isinstance(value, (dict, list)):
                paths.extend(get_all_paths(value, current_path))
    return paths


def get_nested_value(obj, path):
    """Get a value from a nested dictionary using dot notation"""
    try:
        current = obj
        parts = path.split('.')
        for part in parts:
            if '[' in part:  # Handle array indices if present
                key, index = part.split('[')
                index = int(index.rstrip(']'))
                current = current[key][index]
            else:
                current = current[part]
        return current
    except (KeyError, IndexError, TypeError):
        return None


@app.route('/compare_json', methods=['POST'])
def compare_json():
    try:
        file1 = request.files['file1']
        file2 = request.files['file2']

        json1 = json.loads(file1.read().decode('utf-8'))
        json2 = json.loads(file2.read().decode('utf-8'))

        # Compare the JSON structures
        only_in_1 = []
        only_in_2 = []
        different_values = []

        def flatten_json(obj, prefix=''):
            items = {}
            if isinstance(obj, dict):
                for key, value in obj.items():
                    new_key = f"{prefix}.{key}" if prefix else str(key)
                    if isinstance(value, (dict, list)):
                        items.update(flatten_json(value, new_key))
                    else:
                        items[new_key] = value
            elif isinstance(obj, list):
                for i, value in enumerate(obj):
                    new_key = f"{prefix}[{i}]"
                    if isinstance(value, (dict, list)):
                        items.update(flatten_json(value, new_key))
                    else:
                        items[new_key] = value
            return items

        # Flatten both JSONs
        flat_json1 = flatten_json(json1)
        flat_json2 = flatten_json(json2)

        # Find structural differences
        only_in_1 = sorted(set(flat_json1.keys()) - set(flat_json2.keys()))
        only_in_2 = sorted(set(flat_json2.keys()) - set(flat_json1.keys()))

        # Compare values for common keys
        common_keys = set(flat_json1.keys()) & set(flat_json2.keys())
        for key in sorted(common_keys):
            if flat_json1[key] != flat_json2[key]:
                different_values.append({
                    'path': key,
                    'value1': flat_json1[key],
                    'value2': flat_json2[key]
                })

        result = {
            'file1_name': os.path.splitext(file1.filename)[0],
            'file2_name': os.path.splitext(file2.filename)[0],
            'only_in_1': only_in_1,
            'only_in_2': only_in_2,
            'different_values': different_values
        }

        return jsonify(result)

    except json.JSONDecodeError as e:
        return jsonify({'error': f'Invalid JSON format: {str(e)}'}), 400
    except Exception as e:
        app.logger.error(f"Error in comparison: {str(e)}")  # Add logging
        return jsonify({'error': f'Comparison failed: {str(e)}'}), 500


@app.route('/check_static')
def check_static():
    css_path = os.path.join(app.static_folder, 'css/cdo_json_comparison.css')
    js_path = os.path.join(app.static_folder, 'js/cdo_json_comparison.js')

    return {
        'css_exists': os.path.exists(css_path),
        'css_path': css_path,
        'js_exists': os.path.exists(js_path),
        'js_path': js_path,
        'static_folder': app.static_folder,
    }


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('json_comparison.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('json_comparison')


@app.route('/log_excluded_field', methods=['POST'])
def log_excluded_field():
    data = request.json
    field_path = data.get('field_path')
    action = data.get('action')  # 'exclude' or 'include'

    if action == 'exclude':
        logger.info(f'Field excluded: {field_path}')
    else:
        logger.info(f'Field un-excluded: {field_path}')

    return jsonify({'status': 'success'})


@app.route('/machine_readable')
def machine_readable():
    return render_template('mapping_editor.html')


@app.route('/upload_mapping', methods=['POST'])
def upload_mapping():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.xml'):
        return jsonify({'error': 'File must be XML'}), 400

    try:
        xml_content = file.read().decode('utf-8')
        return jsonify({'success': True, 'content': xml_content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/watchdog_results')
def watchdog_results():
    return render_template('watchdog_results.html')


@app.route('/fix_message_comparison')
def fix_message_comparison():
    return render_template('fix_message_comparison.html')


# NEW FIXML Field Analysis Tool
@app.route('/fixml_field_analysis')
def fixml_field_analysis():
    return send_from_directory('static', 'fixml_field_analysis.html')


@app.route('/upload_fixml_venues', methods=['POST'])
def upload_fixml_venues():
    try:
        # Get the number of venues from the form
        num_venues = int(request.form.get('numVenues', 2))

        if num_venues < 2:
            return jsonify({'error': 'Minimum 2 venues required for comparison'}), 400

        if num_venues > 10:  # Set a reasonable maximum
            return jsonify({'error': 'Maximum 10 venues supported'}), 400

        # Check if all required files are provided
        venue_files = {}
        venue_names = {}

        for i in range(1, num_venues + 1):
            file_key = f'venue{i}'
            name_key = f'venueName{i}'

            # Check if file exists and is not empty
            if file_key not in request.files or request.files[file_key].filename == '':
                venue_name = request.form.get(name_key, f'Venue {i}')
                return jsonify({'error': f'{venue_name} file is required'}), 400

            venue_files[file_key] = request.files[file_key]
            venue_names[file_key] = request.form.get(name_key, f'Venue {i}')

        # Process each CSV file
        venue_data = {}
        for venue_key, file in venue_files.items():
            try:
                df = pd.read_csv(file, keep_default_na=False)

                # Validate required columns
                required_columns = ['field_name', 'enumValues', 'Presence']
                missing_columns = [col for col in required_columns if col not in df.columns]
                if missing_columns:
                    return jsonify({
                        'error': f'Missing required columns in {venue_names[venue_key]}: {", ".join(missing_columns)}'
                    }), 400

                venue_data[venue_key] = {
                    'name': venue_names[venue_key],
                    'data': df.to_dict('records')
                }
            except Exception as e:
                return jsonify({
                    'error': f'Error processing {venue_names[venue_key]}: {str(e)}'
                }), 400

        # Analyze the data
        analysis_result = analyze_fixml_venues(venue_data)

        return jsonify(analysis_result)

    except Exception as e:
        app.logger.error(f"Error in upload_fixml_venues: {str(e)}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500


def analyze_fixml_venues(venue_data):
    """Analyze FIXML venue data and create matrices"""

    # Collect all unique field names
    all_fields = set()
    all_enum_values = set()
    all_presence_values = set()

    # Field presence matrix data
    field_matrix = {}
    enum_matrix = {}
    presence_matrix = {}

    venues = list(venue_data.keys())
    venue_names = [venue_data[venue]['name'] for venue in venues]
    num_venues = len(venues)

    # First pass: collect all unique values
    for venue_key, venue_info in venue_data.items():
        for row in venue_info['data']:
            field_name = row['field_name']
            enum_values = str(row['enumValues']).strip() if row['enumValues'] else ''
            presence = str(row['Presence']).strip() if row['Presence'] else ''

            all_fields.add(field_name)
            if enum_values and enum_values != 'nan':
                # Split enum values if they contain multiple values
                enum_list = [val.strip() for val in enum_values.split(',') if val.strip()]
                all_enum_values.update(enum_list)
            if presence and presence != 'nan':
                all_presence_values.add(presence)

    # Initialize matrices
    for field in all_fields:
        field_matrix[field] = {venue: False for venue in venues}

    for enum_val in all_enum_values:
        enum_matrix[enum_val] = {venue: [] for venue in venues}

    for presence_val in all_presence_values:
        presence_matrix[presence_val] = {venue: [] for venue in venues}

    # Second pass: populate matrices
    for venue_key, venue_info in venue_data.items():
        for row in venue_info['data']:
            field_name = row['field_name']
            enum_values = str(row['enumValues']).strip() if row['enumValues'] else ''
            presence = str(row['Presence']).strip() if row['Presence'] else ''

            # Mark field as present in this venue
            field_matrix[field_name][venue_key] = True

            # Process enum values
            if enum_values and enum_values != 'nan':
                enum_list = [val.strip() for val in enum_values.split(',') if val.strip()]
                for enum_val in enum_list:
                    if enum_val in enum_matrix:
                        enum_matrix[enum_val][venue_key].append(field_name)

            # Process presence values
            if presence and presence != 'nan':
                if presence in presence_matrix:
                    presence_matrix[presence][venue_key].append(field_name)

    # Create summary statistics
    field_stats = {}
    for field in all_fields:
        present_count = sum(1 for venue in venues if field_matrix[field][venue])
        field_stats[field] = {
            'present_in': present_count,
            'venues': [venue_data[venue]['name'] for venue in venues if field_matrix[field][venue]]
        }

    # Group fields by presence pattern
    presence_patterns = defaultdict(list)
    for field in all_fields:
        pattern = tuple(field_matrix[field][venue] for venue in venues)
        presence_patterns[pattern].append(field)

    # Calculate dynamic summary statistics
    fields_in_all_venues = len([f for f, stats in field_stats.items() if stats['present_in'] == num_venues])
    fields_in_one_venue = len([f for f, stats in field_stats.items() if stats['present_in'] == 1])
    fields_in_multiple_venues = len([f for f, stats in field_stats.items() if 1 < stats['present_in'] < num_venues])

    return {
        'success': True,
        'venue_names': venue_names,
        'venues': venues,
        'num_venues': num_venues,
        'total_fields': len(all_fields),
        'total_enum_values': len(all_enum_values),
        'total_presence_values': len(all_presence_values),
        'field_matrix': field_matrix,
        'enum_matrix': enum_matrix,
        'presence_matrix': presence_matrix,
        'field_stats': field_stats,
        'presence_patterns': {
            str(pattern): fields for pattern, fields in presence_patterns.items()
        },
        'summary': {
            'fields_in_all_venues': fields_in_all_venues,
            'fields_in_one_venue': fields_in_one_venue,
            'fields_in_multiple_venues': fields_in_multiple_venues
        }
    }
@app.route('/debug_fixml')
def debug_fixml():
    return render_template('debug_fixml_analysis.html')

@app.route('/fixml_to_fix_converter')
def fixml_to_fix_converter():
    return send_from_directory('static', 'fixml_to_fix_converter.html')


if __name__ == '__main__':
    app.run(debug=True)