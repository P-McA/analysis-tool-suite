from flask import Flask, request, jsonify, render_template
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


@app.route('/confluence_comparison')
def confluence_comparison():
    return render_template('confluence_comparison.html')


@app.route('/compare_confluence', methods=['POST'])
def compare_confluence():
    url1 = request.form.get('url1')
    url2 = request.form.get('url2')

    if not url1 or not url2:
        return jsonify({'error': 'Both URLs are required'}), 400

    try:
        comparer = ConfluenceRevisionComparer()
        changes = comparer.compare_pages(url1, url2)
        return jsonify({'changes': changes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
