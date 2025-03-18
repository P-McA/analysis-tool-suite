import os
import time
import pandas as pd
import io
import smtplib
import logging
import re
import schedule
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import configparser

# Set up logging
logging.basicConfig(
    filename='confluence_report_extractor.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Configuration
def load_config():
    config = configparser.ConfigParser()
    try:
        config.read('config.ini')
        return config
    except Exception as e:
        logging.error(f"Error loading configuration: {e}")
        raise

def get_chrome_with_profile():
    """Launch Chrome using the user's default profile"""
    try:
        # Configure Chrome options to use existing profile
        options = Options()
        
        # Mac Chrome profile path
        # Default profile is used if profile_name is not specified in config
        config = load_config()
        profile_name = config['Chrome'].get('profile_name', 'Default')
        
        # Path to the Chrome user data directory
        user_data_dir = os.path.expanduser(f"~/Library/Application Support/Google/Chrome")
        
        # Add the user data directory option
        options.add_argument(f"--user-data-dir={user_data_dir}")
        
        # Add the profile option if not using Default
        if profile_name != 'Default':
            options.add_argument(f"--profile-directory={profile_name}")
            
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        options.add_argument("--start-maximized")
        
        # Create a new Chrome browser instance with the profile
        logging.info(f"Launching Chrome with profile: {profile_name}")
        driver = webdriver.Chrome(options=options)
        return driver
        
    except Exception as e:
        logging.error(f"Failed to launch Chrome with profile: {e}")
        raise

# Extract content from Confluence page with embedded iframes
def extract_from_confluence(confluence_url):
    all_reports_data = []
    all_reports_html = []
    screenshot_files = []
    driver = None
    
    try:
        logging.info(f"Starting extraction from Confluence page: {confluence_url}")
        
        # Get Chrome with user profile
        driver = get_chrome_with_profile()
        
        # Navigate to the Confluence page
        logging.info(f"Navigating to Confluence page: {confluence_url}")
        driver.get(confluence_url)
        
        # Wait for the main content to load
        try:
            WebDriverWait(driver, 30).until(
                EC.presence_of_element_located((By.ID, "main-content"))
            )
        except:
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "content"))
                )
            except Exception as e:
                logging.warning(f"Main content detection timed out: {e}")
                # Continue anyway as some Confluence pages have different structures
        
        # Take a screenshot of the entire page
        page_title = driver.title
        screenshot_file = f"confluence_page_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        driver.save_screenshot(screenshot_file)
        screenshot_files.append((page_title, screenshot_file))
        logging.info(f"Saved full page screenshot to {screenshot_file}")
        
        # Find all iframes in the page
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        logging.info(f"Found {len(iframes)} iframes on the page")
        
        # Process each iframe
        for i, iframe in enumerate(iframes):
            try:
                # Get iframe title or position from its attributes or surrounding elements
                iframe_id = iframe.get_attribute("id") or f"iframe_{i+1}"
                iframe_title = iframe.get_attribute("title") or f"Report {i+1}"
                
                logging.info(f"Processing iframe {i+1}/{len(iframes)}: {iframe_title}")
                
                # Try to determine the report section by looking at preceding headers
                try:
                    # Get the XPath of the iframe
                    iframe_xpath = driver.execute_script("""
                        function getPathTo(element) {
                            if (element.id !== '')
                                return '//*[@id="' + element.id + '"]';
                            if (element === document.body)
                                return '/html/body';

                            var ix = 0;
                            var siblings = element.parentNode.childNodes;
                            for (var i = 0; i < siblings.length; i++) {
                                var sibling = siblings[i];
                                if (sibling === element)
                                    return getPathTo(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                                if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
                                    ix++;
                            }
                        }
                        return getPathTo(arguments[0]);
                    """, iframe)
                    
                    # Find the closest preceding h1, h2, h3, etc.
                    for header_level in range(1, 7):
                        # This XPath finds headers that are before the iframe in document order
                        header_xpath = f"//h{header_level}[count(.|{iframe_xpath}/preceding::h{header_level}[1]) = 1]"
                        headers = driver.find_elements(By.XPATH, header_xpath)
                        if headers:
                            iframe_title = headers[-1].text
                            break
                except Exception as e:
                    logging.warning(f"Error determining report section: {e}")
                
                # Take a screenshot of this iframe area
                iframe_screenshot = f"report_{iframe_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                try:
                    # Scroll the iframe into view
                    driver.execute_script("arguments[0].scrollIntoView(true);", iframe)
                    time.sleep(1)  # Give time for any animations to complete
                    
                    # Take screenshot of the iframe area
                    iframe.screenshot(iframe_screenshot)
                    screenshot_files.append((iframe_title, iframe_screenshot))
                    logging.info(f"Saved iframe screenshot to {iframe_screenshot}")
                except Exception as e:
                    logging.warning(f"Error taking iframe screenshot: {e}")
                
                # Try to switch to the iframe and extract content
                try:
                    driver.switch_to.frame(iframe)
                    
                    # Wait for iframe content to load
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.TAG_NAME, "body"))
                    )
                    
                    # Try to extract any table data
                    try:
                        tables = driver.find_elements(By.TAG_NAME, "table")
                        if tables:
                            table = tables[0]  # Use the first table found
                            headers = [th.text for th in table.find_elements(By.TAG_NAME, "th")]
                            
                            if not headers:  # Try looking for headers in first row
                                headers = [td.text for td in table.find_elements(By.XPATH, "//tr[1]/td")]
                            
                            rows = []
                            for tr in table.find_elements(By.TAG_NAME, "tr")[1:]:  # Skip header row
                                cells = tr.find_elements(By.TAG_NAME, "td")
                                if cells:
                                    rows.append([td.text for td in cells])
                            
                            if headers and rows:
                                # Ensure the number of columns in the data matches the headers
                                max_cols = max([len(row) for row in rows]) if rows else 0
                                if len(headers) < max_cols:
                                    headers.extend([f"Column {i+1}" for i in range(len(headers), max_cols)])
                                elif len(headers) > max_cols and max_cols > 0:
                                    headers = headers[:max_cols]
                                
                                # Create DataFrame
                                df = pd.DataFrame(rows, columns=headers)
                                all_reports_data.append((iframe_title, df))
                                logging.info(f"Successfully extracted table data from iframe {iframe_title}")
                    except Exception as e:
                        logging.warning(f"Could not extract table data from iframe: {e}")
                    
                    # Extract the HTML content
                    iframe_content = driver.find_element(By.TAG_NAME, "body").get_attribute('outerHTML')
                    all_reports_html.append((iframe_title, iframe_content))
                    
                    # Switch back to the main content
                    driver.switch_to.default_content()
                    
                except Exception as e:
                    logging.warning(f"Error extracting content from iframe: {e}")
                    # Make sure we switch back to the main content
                    driver.switch_to.default_content()
                
            except Exception as e:
                logging.error(f"Error processing iframe {i}: {e}")
                # Make sure we switch back to the main content
                driver.switch_to.default_content()
            
    except Exception as e:
        logging.error(f"Error extracting from Confluence: {e}")
        
    finally:
        if driver:
            driver.quit()
            logging.info("Browser closed")
        
    return all_reports_data, all_reports_html, screenshot_files

# Compile reports into a single Excel file with multiple sheets
def compile_reports_to_excel(all_reports_data, screenshot_files):
    try:
        # Create a BytesIO object to store the Excel file
        excel_buffer = io.BytesIO()
        
        # Create ExcelWriter object with xlsxwriter engine
        with pd.ExcelWriter(excel_buffer, engine='xlsxwriter') as writer:
            workbook = writer.book
            
            # Create a summary sheet
            summary_data = {
                'Report Name': [data[0] for data in all_reports_data],
                'Row Count': [len(data[1]) for data in all_reports_data]
            }
            summary_df = pd.DataFrame(summary_data)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Add each report as a separate sheet
            for title, df in all_reports_data:
                # Ensure sheet name is valid (Excel has a 31 character limit)
                sheet_name = re.sub(r'[\\/*\[\]:?]', '-', title)[:31]
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                # Auto-adjust columns width
                worksheet = writer.sheets[sheet_name]
                for i, col in enumerate(df.columns):
                    max_len = max(
                        df[col].astype(str).map(len).max(),
                        len(str(col))
                    ) + 2
                    worksheet.set_column(i, i, max_len)
            
            # Add a sheet for screenshots if available
            if screenshot_files:
                screenshot_sheet = workbook.add_worksheet('Screenshots')
                screenshot_sheet.write(0, 0, 'Report Section')
                screenshot_sheet.write(0, 1, 'Screenshot File')
                
                for i, (title, file) in enumerate(screenshot_files):
                    screenshot_sheet.write(i+1, 0, title)
                    screenshot_sheet.write(i+1, 1, file)
        
        # Get the Excel content
        excel_buffer.seek(0)
        return excel_buffer.getvalue()
        
    except Exception as e:
        logging.error(f"Error compiling Excel report: {e}")
        raise

# Create HTML report with all report content and screenshots
def compile_reports_to_html(all_reports_html, screenshot_files):
    try:
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; }
                .report-section { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; }
                h2 { color: #0D5C91; }
                img { max-width: 100%; border: 1px solid #ddd; margin: 10px 0; }
            </style>
        </head>
        <body>
            <h1>Splunk Reports from Confluence</h1>
            <p>Generated on: {date}</p>
            <hr>
        """.format(date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        
        # Add table of contents
        html_content += "<h2>Table of Contents</h2><ul>"
        for i, (title, _) in enumerate(all_reports_html):
            html_content += f'<li><a href="#report{i}">{title}</a></li>'
        html_content += "</ul><hr>"
        
        # Add each report section with screenshots
        for i, (title, content) in enumerate(all_reports_html):
            html_content += f"""
            <div class="report-section" id="report{i}">
                <h2>{title}</h2>
            """
            
            # Add screenshot if available for this section
            matching_screenshots = [file for section, file in screenshot_files if section == title]
            if matching_screenshots:
                for screenshot in matching_screenshots:
                    html_content += f'<img src="{screenshot}" alt="{title}" />'
            
            # Add the HTML content (with some cleanup for embedded content)
            # Remove scripts and certain problematic elements
            clean_content = re.sub(r'<script.*?</script>', '', content, flags=re.DOTALL)
            html_content += clean_content
            
            html_content += """
            </div>
            <hr>
            """
        
        html_content += "</body></html>"
        return html_content
        
    except Exception as e:
        logging.error(f"Error compiling HTML report: {e}")
        return "<html><body><h1>Error generating report</h1></body></html>"

# Send email with attachments
def send_email(recipients, subject, body, excel_attachment=None, html_content=None, screenshot_files=None):
    config = load_config()
    email_config = config['Email']
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = email_config['from_address']
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = subject
        
        # Attach plain text body
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach HTML body if available
        if html_content:
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
        
        # Attach Excel file if available
        if excel_attachment:
            attachment = MIMEApplication(excel_attachment)
            attachment.add_header('Content-Disposition', 'attachment', 
                                 filename=f'Splunk_Reports_{datetime.now().strftime("%Y-%m-%d")}.xlsx')
            msg.attach(attachment)
        
        # Attach screenshot files if available and within sensible size
        if screenshot_files and config['Email'].getboolean('attach_screenshots', fallback=False):
            for title, file in screenshot_files:
                try:
                    with open(file, 'rb') as f:
                        screenshot_data = f.read()
                        if len(screenshot_data) < 5 * 1024 * 1024:  # < 5MB
                            img_attachment = MIMEApplication(screenshot_data)
                            img_attachment.add_header('Content-Disposition', 'attachment', filename=file)
                            msg.attach(img_attachment)
                except Exception as e:
                    logging.warning(f"Error attaching screenshot {file}: {e}")
        
        # Connect to SMTP server and send email
        with smtplib.SMTP(email_config['smtp_server'], int(email_config['smtp_port'])) as server:
            if email_config.getboolean('use_tls'):
                server.starttls()
            
            if email_config['smtp_user'] and email_config['smtp_password']:
                server.login(email_config['smtp_user'], email_config['smtp_password'])
            
            server.send_message(msg)
            
        logging.info(f"Email sent successfully to {', '.join(recipients)}")
        return True
        
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False

# Main function to run the report extraction process
def run_report_extraction():
    logging.info("Starting report extraction from Confluence")
    
    try:
        config = load_config()
        confluence_url = config['Confluence']['page_url']
        
        recipients = config['Email']['recipients'].split(',')
        recipients = [email.strip() for email in recipients if email.strip()]
        
        # Extract from Confluence page
        all_reports_data, all_reports_html, screenshot_files = extract_from_confluence(confluence_url)
        
        if not all_reports_data and not all_reports_html and not screenshot_files:
            logging.error("No report data was retrieved")
            return
        
        # Create reports
        excel_attachment = None
        if all_reports_data:
            excel_attachment = compile_reports_to_excel(all_reports_data, screenshot_files)
            
        html_content = compile_reports_to_html(all_reports_html, screenshot_files)
        
        # Send email
        subject = f"Splunk Reports - {datetime.now().strftime('%Y-%m-%d')}"
        body = f"""
        Hello,
        
        Please find attached the daily Splunk reports from our Confluence page for {datetime.now().strftime('%Y-%m-%d')}.
        
        This is an automated email. If you have any questions, please contact the IT team.
        """
        
        send_email(recipients, subject, body, excel_attachment, html_content, screenshot_files)
        
        # Clean up screenshot files if configured to do so
        if config['Cleanup'].getboolean('delete_screenshots', fallback=True):
            for _, file in screenshot_files:
                try:
                    os.remove(file)
                    logging.info(f"Deleted screenshot file: {file}")
                except Exception as e:
                    logging.warning(f"Error deleting screenshot file {file}: {e}")
        
        logging.info("Report extraction process completed successfully")
            
    except Exception as e:
        logging.error(f"Error in run_report_extraction: {e}")

# Schedule function
def schedule_task():
    config = load_config()
    schedule_time = config['Schedule']['daily_time']
    
    schedule.every().day.at(schedule_time).do(run_report_extraction)
    logging.info(f"Task scheduled to run daily at {schedule_time}")
    
    while True:
        schedule.run_pending()
        time.sleep(60)

# Run immediately if executed directly
if __name__ == "__main__":
    # Check if we should run immediately or just schedule
    config = load_config()
    if config['Schedule'].getboolean('run_on_start'):
        run_report_extraction()
    
    # Start the scheduler
    schedule_task()
