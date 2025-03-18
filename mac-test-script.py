import time
import logging
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import configparser

# Set up logging to console
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

def test_confluence_access():
    """Simple test to check if we can access Confluence and take screenshots"""
    driver = None
    try:
        print("\n=== CONFLUENCE CONNECTION TEST ===")
        
        # Load configuration
        config = load_config()
        confluence_url = config['Confluence']['page_url']
        print(f"Target URL: {confluence_url}")
        
        # Configure Chrome
        print("Launching Chrome browser...")
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        # Create a new Chrome browser instance
        driver = webdriver.Chrome(options=options)
        
        # Navigate to the Confluence page
        print(f"Navigating to Confluence page...")
        driver.get(confluence_url)
        
        # Check if credentials section exists and is enabled
        user_credentials = None
        if ('Credentials' in config and 
            'username' in config['Credentials'] and 
            config['Credentials']['username'] and
            'password' in config['Credentials'] and 
            config['Credentials']['password']):
            
            user_credentials = {
                'username': config['Credentials']['username'],
                'password': config['Credentials']['password']
            }
            print("Credentials found in config.ini")
            
            # Handle login if needed
            if "login" in driver.current_url.lower():
                print("Login page detected, attempting to log in...")
                try:
                    # Wait for username field
                    WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.ID, "username"))
                    )
                    
                    # Enter username
                    username_field = driver.find_element(By.ID, "username")
                    username_field.send_keys(user_credentials['username'])
                    
                    # Click "Continue" or similar button if present
                    try:
                        continue_button = driver.find_element(By.ID, "login-submit")
                        continue_button.click()
                        
                        # Wait for password field (if using two-step login)
                        WebDriverWait(driver, 10).until(
                            EC.presence_of_element_located((By.ID, "password"))
                        )
                    except:
                        pass  # Continue button might not be present
                    
                    # Enter password
                    password_field = driver.find_element(By.ID, "password")
                    password_field.send_keys(user_credentials['password'])
                    
                    # Click login button
                    login_button = driver.find_element(By.ID, "login-submit")
                    login_button.click()
                    
                    print("Login form submitted")
                    
                except Exception as e:
                    print(f"Error during login: {e}")
            else:
                print("No login page detected, continuing...")
        else:
            print("No credentials found in config.ini or they are commented out")
        
        # Wait for page to load
        print("Waiting for page to load...")
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.ID, "main-content"))
            )
            print("✅ Main content element found!")
        except:
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "content"))
                )
                print("✅ Content element found!")
            except:
                print("⚠️ Could not detect standard content elements, but continuing...")
        
        # Take a screenshot
        screenshot_file = "test_screenshot.png"
        driver.save_screenshot(screenshot_file)
        print(f"✅ Screenshot saved to {screenshot_file}")
        
        # Get page title
        page_title = driver.title
        print(f"Page title: {page_title}")
        
        # Check for iframes
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        print(f"Found {len(iframes)} iframes on the page")
        
        # Test accessing the first iframe if available
        if iframes:
            try:
                iframe = iframes[0]
                print(f"Testing access to first iframe (id={iframe.get_attribute('id') or 'unknown'})...")
                
                # Scroll to iframe
                driver.execute_script("arguments[0].scrollIntoView(true);", iframe)
                time.sleep(1)
                
                # Take iframe screenshot
                iframe_screenshot = "iframe_test_screenshot.png"
                iframe.screenshot(iframe_screenshot)
                print(f"✅ iframe screenshot saved to {iframe_screenshot}")
                
                # Try to switch to iframe
                driver.switch_to.frame(iframe)
                iframe_content = driver.find_element(By.TAG_NAME, "body").text[:200]
                print(f"iframe content preview: {iframe_content}...")
                
                # Switch back
                driver.switch_to.default_content()
                print("✅ Successfully accessed iframe content")
                
            except Exception as e:
                print(f"❌ Error accessing iframe: {e}")
        
        print("\n=== TEST RESULTS ===")
        print(f"✅ Successfully loaded: {confluence_url}")
        print(f"✅ Page title: {page_title}")
        print(f"✅ Found {len(iframes)} iframes")
        print(f"✅ Screenshots saved")
        print("\nThe test was successful! You can now run the full extraction script.")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        
    finally:
        if driver:
            driver.quit()
            print("Browser closed")

if __name__ == "__main__":
    test_confluence_access()
