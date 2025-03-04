import re
import json
import csv


def extract_report_fields_and_values(json_text):
    results = []

    # Find all field IDs starting with "Report."
    field_id_pattern = r'"id"\s*:\s*"(Report\.[^"]+)"'
    field_matches = re.findall(field_id_pattern, json_text)

    for field_id in field_matches:
        # Find the values section associated with this field
        values_section_pattern = r'"relativePath"\s*:\s*"' + re.escape(field_id) + r'".*?"values"\s*:\s*\[(.*?)\]'
        values_section_match = re.search(values_section_pattern, json_text, re.DOTALL)

        if values_section_match:
            values_section = values_section_match.group(1)
            # Extract individual value entries
            value_entries = re.finditer(r'{(.*?)}', values_section, re.DOTALL)

            for entry in value_entries:
                entry_text = entry.group(1)
                # Extract ID (Enum)
                enum_match = re.search(r'"id"\s*:\s*"([^"]+)"', entry_text)
                # Extract alternateId (Shortcode)
                shortcode_match = re.search(r'"alternateId"\s*:\s*"([^"]+)"', entry_text)

                if enum_match:
                    enum = enum_match.group(1)
                    shortcode = shortcode_match.group(1) if shortcode_match else ""
                    results.append({
                        "Field": field_id,
                        "Enum": enum,
                        "Shortcode": shortcode
                    })
        else:
            # Handle fields with no values
            results.append({
                "Field": field_id,
                "Enum": "",
                "Shortcode": ""
            })

    return results


def process_file(input_file_path, output_file_path):
    try:
        with open(input_file_path, 'r') as file:
            content = file.read()

        results = extract_report_fields_and_values(content)

        # Write results to CSV
        with open(output_file_path, 'w', newline='') as csvfile:
            fieldnames = ['Field', 'Enum', 'Shortcode']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            for row in results:
                writer.writerow(row)

        print(f"Processing complete. Results saved to {output_file_path}")

    except Exception as e:
        print(f"An error occurred: {e}")


def main():
    # For demonstration - replace with actual file paths
    input_file_path = "input.txt"  # Path to the input file
    output_file_path = "report_fields_and_values.csv"  # Path for the output CSV

    process_file(input_file_path, output_file_path)

    test_results = extract_report_fields_and_values(test_content)
    print("\nTest Results:")
    print("Field, Enum, Shortcode")
    for row in test_results:
        print(f"{row['Field']}, {row['Enum']}, {row['Shortcode']}")


if __name__ == "__main__":
    main()