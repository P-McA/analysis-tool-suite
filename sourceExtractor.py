import re
import json
def extract_report_fields_and_values(json_text):
    try:
        cleaned_text = re.sub(r'(\w+)\s*:', r'"\1":', json_text)
        cleaned_text = re.sub(r',\s*}', r'}', cleaned_text)
        data = json.loads(cleaned_text)
        return process_json_data(data)
    except json.JSONDecodeError:
        return regex_extraction(json_text)


def process_json_data(data):
    results = {}
    if isinstance(data, dict):
        field_id = data.get("id", "")
        if isinstance(field_id, str) and field_id.startswith("Report."):
            values = []
            if "values" in data and isinstance(data["values"], list):
                for value_item in data["values"]:
                    if isinstance(value_item, dict) and "id" in value_item:
                        values.append(value_item["id"])
            results[field_id] = values

        for key, value in data.items():
            child_results = process_json_data(value)
            results.update(child_results)

    elif isinstance(data, list):
        for item in data:
            child_results = process_json_data(item)
            results.update(child_results)

    return results


def regex_extraction(text):
    results = {}

    field_id_pattern = r'"id"\s*:\s*"(Report\.[^"]+)"'
    field_matches = re.findall(field_id_pattern, text)

    for field_id in field_matches:
        values_pattern = r'"' + re.escape(field_id) + r'".*?"values"\s*:\s*\[(.*?)\]'
        values_section_match = re.search(values_pattern, text, re.DOTALL)

        if values_section_match:
            values_section = values_section_match.group(1)
            value_id_pattern = r'"id"\s*:\s*"([^"]+)"'
            values = re.findall(value_id_pattern, values_section)
            results[field_id] = values

    return results


def main():
    # For file input
    # with open('input.txt', 'r') as file:
    #     content = file.read()

    # For direct text input (example)
    results = extract_report_fields_and_values(content)

    # Print results in the requested format
    for field_id, values in results.items():
        print(f"Field\n{field_id}\n")
        print("Values")
        for value in values:
            print(value)
        print()


if __name__ == "__main__":
    main()