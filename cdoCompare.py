import csv

def compare_csv_files(file_a, file_b):
    # Reading File A into a dictionary with case-insensitive IDs
    with open(file_a, mode='r', newline='', encoding='utf-8') as f_a:
        reader_a = csv.DictReader(f_a)
        data_a = {row['ID'].strip().lower(): row for row in reader_a}  # Using lowercase keys for case-insensitivity

    # Reading File B into a dictionary with case-insensitive IDs
    with open(file_b, mode='r', newline='', encoding='utf-8') as f_b:
        reader_b = csv.DictReader(f_b)
        data_b = {row['ID'].strip().lower(): row for row in reader_b}  # Using lowercase keys for case-insensitivity

    # Lists to store results for logging
    fields_present_in_both = []
    presence_mismatch = []
    values_mismatch = []
    potentially_enriched_fields = []
    fields_to_confirm = []

    # Step 1: Check if ID from File A is in File B and compare fields
    for id_a_lower, row_a in data_a.items():
        if id_a_lower in data_b:
            # Log that field is present in both files (using original ID from File A for logging)
            original_id_a = row_a['ID']
            fields_present_in_both.append(original_id_a)

            # Compare Presence
            if row_a['Presence'] == data_b[id_a_lower]['Presence']:
                print(f"Presence correct for ID {original_id_a}")
            else:
                presence_mismatch.append(
                    f"Presence mismatch for ID {original_id_a}: File A = {row_a['Presence']}, File B = {data_b[id_a_lower]['Presence']}"
                )

            # Compare Values
            values_a = set(row_a['Values'].split()) if row_a['Values'] else set()
            values_b = set(data_b[id_a_lower]['Values'].split()) if data_b[id_a_lower]['Values'] else set()

            if values_a == values_b:
                print(f"Values correct for ID {original_id_a}")
            else:
                values_mismatch.append(
                    f"Values mismatch for ID {original_id_a}: File A = {', '.join(values_a)}, File B = {', '.join(values_b)}"
                )

        else:
            # If ID is in File A but not in File B
            potentially_enriched_fields.append(row_a['ID'])

    # Step 2: Check if ID from File B is in File A
    for id_b_lower, row_b in data_b.items():
        if id_b_lower not in data_a:
            # If ID is in File B but not in File A
            fields_to_confirm.append(row_b['ID'])

    # Summary Logging
    print("\nSummary of Comparison:")

    # Fields Present in Both
    print("\nFields Present in Both Files:")
    for field in fields_present_in_both:
        print(field)

    # Presence Mismatch
    if presence_mismatch:
        print("\nPresence Mismatch Details:")
        for detail in presence_mismatch:
            print(detail)

    # Values Mismatch
    if values_mismatch:
        print("\nValues Mismatch Details:")
        for detail in values_mismatch:
            print(detail)

    # Potentially Enriched Fields
    print("\nPotentially Enriched Fields in File A (Not in File B):")
    for field in potentially_enriched_fields:
        print(field)

    # Fields to Confirm if Actually Set
    print("\nFields to Confirm if Actually Set (In File B but Not in File A):")
    for field in fields_to_confirm:
        print(field)


# Example usage
if __name__ == "__main__":
    file_a = 'fileA.csv'  # Replace with your actual file path for File A
    file_b = 'fileB.csv'  # Replace with your actual file path for File B

    compare_csv_files(file_a, file_b)