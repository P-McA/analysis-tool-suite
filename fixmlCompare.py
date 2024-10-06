import xml.etree.ElementTree as ET
import os

def parse_fixml_file(file_path):
    with open(file_path, 'r') as file:
        xml_string = file.read()
    root = ET.fromstring(xml_string)
    return extract_fields(root)

def extract_fields(element, prefix=''):
    fields = {}
    tag = element.tag.split('}')[-1]  # Remove namespace if present
    new_prefix = f"{prefix}/{tag}" if prefix else tag
    for attr, value in element.attrib.items():
        fields[f"{new_prefix}/@{attr}"] = value
    for child in element:
        fields.update(extract_fields(child, new_prefix))
    return fields

def compare_fixml_files(file_path1, file_path2):
    fields1 = parse_fixml_file(file_path1)
    fields2 = parse_fixml_file(file_path2)

    only_in_1 = sorted(set(fields1.keys()) - set(fields2.keys()))
    only_in_2 = sorted(set(fields2.keys()) - set(fields1.keys()))
    different_values = sorted(
        (key, fields1[key], fields2[key])
        for key in set(fields1.keys()) & set(fields2.keys())
        if fields1[key] != fields2[key]
    )

    return only_in_1, only_in_2, different_values

def generate_summary(only_in_1, only_in_2, different_values, file_name1, file_name2):
    summary = f"Fields in {file_name1} Only:\n"
    summary += "\n".join(field if field.startswith("TrdCaptRpt/") else f"TrdCaptRpt/{field}" for field in only_in_1) + "\n\n"

    summary += f"Fields in {file_name2} Only:\n"
    summary += "\n".join(field if field.startswith("TrdCaptRpt/") else f"TrdCaptRpt/{field}" for field in only_in_2) + "\n\n"

    summary += "Fields with Different Values:\n"
    for key, value1, value2 in different_values:
        formatted_key = key if key.startswith("TrdCaptRpt/") else f"TrdCaptRpt/{key}"
        summary += f"{formatted_key}\n"
        summary += f"{file_name1} = {value1}\n"
        summary += f"{file_name2} = {value2}\n\n"

    return summary.strip()

def main():
    file_path1 = 'cme_spread.xml'
    file_path2 = 'cme_pit_fut.xml'

    file_name1 = os.path.basename(file_path1)
    file_name2 = os.path.basename(file_path2)

    only_in_1, only_in_2, different_values = compare_fixml_files(file_path1, file_path2)
    summary = generate_summary(only_in_1, only_in_2, different_values, file_name1, file_name2)
    print(summary)

if __name__ == "__main__":
    main()