import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import logging
import argparse

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class FIXMLToFIXConverter:
    """
    A tool to convert FIXML paths to FIX tags.
    """

    def __init__(self, spec_url=None):
        """
        Initialize the converter.

        Args:
            spec_url (str): URL to the FIX specification.
        """
        self.spec_url = spec_url or "https://fiximate.fixtrading.org/en/FIX.Latest/fields_sorted_by_tagnum.html"

        # Load field to tag mappings
        self.field_to_tag = {}

        # Load mappings from FIX specification
        self.load_fix_specification()

        # Add known FIXML-specific mappings
        self.add_fixml_mappings()

        logger.info(f"Loaded {len(self.field_to_tag)} field-to-tag mappings")

    def load_fix_specification(self):
        """
        Load field-to-tag mappings from the FIX specification website.
        """
        try:
            logger.info(f"Loading FIX specification from {self.spec_url}")
            response = requests.get(self.spec_url)
            soup = BeautifulSoup(response.text, 'html.parser')

            # Find tables in the spec
            tables = soup.find_all('table')

            for table in tables:
                headers = [th.text.strip() for th in table.find_all('th')]

                # Look for tables with 'Tag' and 'Name' columns
                if 'Tag' in headers and 'Name' in headers:
                    tag_index = headers.index('Tag')
                    name_index = headers.index('Name')

                    for row in table.find_all('tr')[1:]:  # Skip header row
                        cells = row.find_all('td')
                        if len(cells) > max(tag_index, name_index):
                            tag_text = cells[tag_index].text.strip()
                            name = cells[name_index].text.strip()

                            if tag_text.isdigit():
                                tag = int(tag_text)

                                # Add the mapping and normalized versions
                                self.field_to_tag[name] = tag
                                self.field_to_tag[name.lower()] = tag
                                self.field_to_tag[re.sub(r'[^a-zA-Z0-9]', '', name)] = tag
                                self.field_to_tag[re.sub(r'[^a-zA-Z0-9]', '', name).lower()] = tag

            logger.info(f"Loaded {len(self.field_to_tag)} mappings from FIX specification")

        except Exception as e:
            logger.error(f"Error loading FIX specification: {e}")
            logger.error(str(e))

    def add_fixml_mappings(self):
        """
        Add common FIXML to FIX tag mappings.
        These mappings are based on the FIX standard but may need adjustments
        for specific implementations.
        """
        # Common FIXML to FIX tag mappings
        # The actual mappings would be more extensive in a production system
        fixml_mappings = {
            # Date/Time fields
            "EndDt": 432,  # ExpireDate
            "StartDt": 75,  # TradeDate

            # Header fields
            "SID": 49,  # SenderCompID
            "SSub": 50,  # SenderSubID
            "Snt": 52,  # SendingTime
            "TID": 1003,  # TradeID

            # Instrument fields
            "AltIDSrc": 455,  # SecurityAltIDSource
            "AltID": 454,  # SecurityAltID
            "CFI": 461,  # CFICode
            "Desc": 107,  # SecurityDesc
            "Exch": 207,  # SecurityExchange
            "GUID": 354,  # EncodedTextLen
            "ID": 48,  # SecurityID
            "PxQteCcy": 15,  # Currency
            "SecTyp": 167,  # SecurityType
            "Src": 22,  # IDSource
            "SubTyp": 762,  # SecuritySubType
            "Sym": 55,  # Symbol

            # Common market identifiers
            "CME": 207,  # SecurityExchange (Chicago Mercantile Exchange)
            "QDMFI": 762,  # SecuritySubType
            "BTEU": 207,  # SecurityExchange (Bloomberg Trading)
            "BTUS": 207,  # SecurityExchange

            # Currency codes - these would typically be values for tag 15
            "EUR": 15,  # Currency
            "GBP": 15,  # Currency
            "USD": 15,  # Currency

            # Security types - these would typically be values for tag 167
            "EUSOV": 167,  # SecurityType
            "EUSUP": 167,  # SecurityType
            "MLEG": 167,  # SecurityType
            "REPO": 167,  # SecurityType
            "TBOND": 167,  # SecurityType
            "TNOTE": 167,  # SecurityType
            "GC": 167,  # SecurityType
            "GCF": 167,  # SecurityType
            "RB": 167,  # SecurityType
            "RV": 167,  # SecurityType
            "SPEC": 167,  # SecurityType
        }

        # Add the mappings to our dictionary
        self.field_to_tag.update(fixml_mappings)
        logger.info(f"Added {len(fixml_mappings)} FIXML-specific mappings")

    def extract_field_from_path(self, fixml_path):
        """
        Extract the field name from a FIXML path.

        Args:
            fixml_path (str): FIXML path like "TrdCaptRpt/FinDetls/@EndDt"

        Returns:
            str: Extracted field name
        """
        # Handle attribute notation (@)
        if '@' in fixml_path:
            return fixml_path.split('@')[-1]

        # Handle element path notation (/)
        parts = fixml_path.split('/')
        return parts[-1]

    def map_fixml_to_fix_tag(self, fixml_path):
        """
        Map a FIXML path to a FIX tag.

        Args:
            fixml_path (str): FIXML path like "TrdCaptRpt/FinDetls/@EndDt"

        Returns:
            str or int: FIX tag number or "Unknown" message
        """
        try:
            # Extract the field name
            field_name = self.extract_field_from_path(fixml_path)

            # Look up the tag number
            tag = self.field_to_tag.get(field_name)
            if tag is not None:
                return tag

            # Try normalized versions
            normalized = field_name.lower()
            tag = self.field_to_tag.get(normalized)
            if tag is not None:
                return tag

            normalized = re.sub(r'[^a-zA-Z0-9]', '', field_name)
            tag = self.field_to_tag.get(normalized)
            if tag is not None:
                return tag

            normalized = re.sub(r'[^a-zA-Z0-9]', '', field_name).lower()
            tag = self.field_to_tag.get(normalized)
            if tag is not None:
                return tag

            # Return Unknown if no mapping found
            return f"Unknown ({field_name})"
        except Exception as e:
            logger.error(f"Error mapping {fixml_path}: {e}")
            return f"Error ({fixml_path})"

    def convert_spreadsheet(self, input_file, output_file, fixml_column=None):
        """
        Convert FIXML paths in a spreadsheet to FIX tags.

        Args:
            input_file (str): Path to input spreadsheet (Excel or CSV)
            output_file (str): Path to output spreadsheet (Excel)
            fixml_column (str): Name of column containing FIXML paths

        Returns:
            DataFrame: The processed dataframe, or None on error
        """
        try:
            # Read the input file
            logger.info(f"Reading input file: {input_file}")

            if input_file.lower().endswith('.csv'):
                df = pd.read_csv(input_file)
            else:
                df = pd.read_excel(input_file)

            # Determine which column contains FIXML paths
            if fixml_column is None:
                fixml_column = df.columns[0]  # Default to first column

            logger.info(f"Using column '{fixml_column}' for FIXML paths")

            # Add a new column with FIX tags
            df['FIX_Tag'] = df[fixml_column].apply(self.map_fixml_to_fix_tag)

            # Save to output file
            logger.info(f"Saving output to: {output_file}")
            df.to_excel(output_file, index=False)

            return df

        except Exception as e:
            logger.error(f"Error processing spreadsheet: {e}")
            logger.error(str(e))
            return None


def main():
    """
    Main function for command-line interface.
    """
    parser = argparse.ArgumentParser(description='Convert FIXML paths to FIX tags')
    parser.add_argument('input', help='Input spreadsheet file (Excel or CSV)')
    parser.add_argument('output', help='Output spreadsheet file (Excel)')
    parser.add_argument('--spec', help='URL to FIX specification', default=None)
    parser.add_argument('--column', help='Column containing FIXML paths', default=None)

    args = parser.parse_args()

    converter = FIXMLToFIXConverter(args.spec)
    result = converter.convert_spreadsheet(args.input, args.output, args.column)

    if result is not None:
        print(f"Conversion completed successfully. Results saved to {args.output}")
        print(f"Added FIX_Tag column with corresponding FIX tag numbers")
    else:
        print("Conversion failed. Check the logs for details.")


if __name__ == "__main__":
    main()