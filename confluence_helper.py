from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from typing import Dict, List, Tuple
import re


class ConfluenceTableComparer:
    def __init__(self):
        self.driver = None

    def start_browser(self):
        if not self.driver:
            chrome_options = webdriver.ChromeOptions()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            self.driver = webdriver.Chrome(options=chrome_options)

    def close_browser(self):
        if self.driver:
            self.driver.quit()
            self.driver = None

    def extract_table_data(self, html_content: str) -> Dict[str, dict]:
        """
        Extracts table data where there's a colgroup tag and returns a dictionary
        with Destination field as key
        """
        soup = BeautifulSoup(html_content, 'html.parser')

        # Find tables with colgroup
        tables = soup.find_all('table', {'class': 'confluenceTable'})
        table_data = {}

        for table in tables:
            if table.find('colgroup'):
                # Get headers
                headers = []
                header_row = table.find('tr')
                if header_row:
                    headers = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]

                # Ensure first column is "Destination"
                if not headers or headers[0] != "Destination":
                    continue

                # Process data rows
                for row in table.find_all('tr')[1:]:  # Skip header row
                    cells = row.find_all(['td', 'th'])
                    if not cells:
                        continue

                    # Get destination field (key)
                    destination = cells[0].get_text(strip=True)
                    if not destination:
                        continue

                    # Store all column values for this destination
                    row_data = {}
                    for i, cell in enumerate(cells[1:], 1):  # Skip Destination column
                        if i < len(headers):
                            row_data[headers[i]] = cell.get_text(strip=True)

                    table_data[destination] = row_data

        return table_data

    def get_page_content(self, url: str) -> str:
        """
        Retrieves the page content from Confluence
        """
        try:
            self.driver.get(url)

            # Wait for the main content to load
            content = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "main-content"))
            )

            return content.get_attribute('innerHTML')
        except Exception as e:
            return f"Error retrieving page content: {str(e)}"

    def compare_tables(self, url1: str, url2: str) -> List[dict]:
        """
        Compares tables from two Confluence pages and returns the changes
        """
        try:
            self.start_browser()

            # Get content from both pages
            content1 = self.get_page_content(url1)
            content2 = self.get_page_content(url2)

            # Extract table data from both pages
            table_data1 = self.extract_table_data(content1)
            table_data2 = self.extract_table_data(content2)

            # Compare and generate revision history
            changes = []

            # Check for new fields
            for destination in table_data2.keys():
                if destination not in table_data1:
                    changes.append({
                        'type': 'new_field',
                        'field': destination
                    })
                    continue

                # Compare existing fields
                for column, new_value in table_data2[destination].items():
                    old_value = table_data1[destination].get(column, '')
                    if old_value != new_value:
                        changes.append({
                            'type': 'field_update',
                            'field': destination,
                            'column': column,
                            'old_value': old_value,
                            'new_value': new_value
                        })

            # Check for removed fields
            for destination in table_data1.keys():
                if destination not in table_data2:
                    changes.append({
                        'type': 'removed_field',
                        'field': destination
                    })

            return changes

        finally:
            self.close_browser()