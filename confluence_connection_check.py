import time
import logging
import configparser
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def load_config():
    """Load configuration from config.ini file"""
    config = configparser.ConfigParser()
    try:
        config.read('config.ini')
        return config
    except Exception as e:
        logging.error(f"Error loading configuration: {e}")
        raise

def connect_to_chrome_session(debugging_port=9222):
    """Connect to an existing Chrome browser session"""
    try:
        options = Options()
        options.add_experimental_option("debuggerAddress", f"127.0.0.1:{debugging_port}")
        driver = webdriver.Chrome(options=options)
        logging.info(f"Successfully connected to Chrome on port {debugging_port}")
        return driver
    except Exception as e:
        logging.error(f"Failed to connect to Chrome: {e}")
        raise

def check_confluence_access(driver, confluence_url):
    """Check if we can access the Confluence page"""
    try:
        logging.info(f"Attempting to navigate to Confluence page: {confluence_url}")
        
        # Record the start time
        start_time = time.time()
        
        # Navigate to the Confluence page
        driver.get(confluence_url)
        
        # Wait for the main content to load (timeout after 30 seconds)
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.ID, "main-content"))
        )
        
        # Calculate load time
        load_time = time.time() - start_time
        
        # Check the page title
        page_title = driver.title
        
        # Check for embedded iframes
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        iframe_count = len(iframes)
        
        # Log success information
        logging.info(f"✅ Successfully loaded Confluence page!")
        logging.info(f"   Title: {page_title}")
        logging.info(f"   Load time: {load_time:.2f} seconds")
        logging.info(f"   Found {iframe_count} embedded iframes")
        
        if iframe_count == 0:
            logging.warning("⚠️ No iframes found on the page. Is this the correct Confluence page with embedded Splunk reports?")
        
        return True, {
            "title": page_title,
            "load_time": load_time,
            "iframe_count": iframe_count
        }
        
    except Exception as e:
        logging.error(f"❌ Failed to access Confluence page: {e}")
        return False, str(e)

if __name__ == "__main__":
    try:
        # Load configuration
        config = load_config()
        confluence_url = config['Confluence']['page_url']
        debugging_port = int(config['Browser']['debugging_port'])
        
        # Connect to Chrome
        driver = connect_to_chrome_session(debugging_port)
        
        try:
            # Check if we can access the Confluence page
            success, result = check_confluence_access(driver, confluence_url)
            
            if success:
                print("\n==================================================")
                print("✅ CONFLUENCE CONNECTION CHECK SUCCESSFUL")
                print("==================================================")
                print(f"Page Title: {result['title']}")
                print(f"Load Time: {result['load_time']:.2f} seconds")
                print(f"Found {result['iframe_count']} embedded iframes")
                print("==================================================")
                
                if result['iframe_count'] == 0:
                    print("\n⚠️  WARNING: No iframes were found on the page.")
                    print("    Please verify this is the correct Confluence page")
                    print("    with embedded Splunk reports.")
            else:
                print("\n==================================================")
                print("❌ CONFLUENCE CONNECTION CHECK FAILED")
                print("==================================================")
                print(f"Error: {result}")
                print("==================================================")
                
        finally:
            # Don't close the browser since we didn't launch it
            pass
            
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        print("\n==================================================")
        print("❌ CONFLUENCE CONNECTION CHECK FAILED")
        print("==================================================")
        print(f"Error: {e}")
        print("==================================================")
