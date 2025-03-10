import os
import time
import logging
import configparser
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

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
        
        print(f"Using Chrome profile directory: {user_data_dir}")
        print(f"Using profile: {profile_name}")
        
        # Add the user data directory option
        options.add_argument(f"--user-data-dir={user_data_dir}")
        
        # Add the profile option if not using Default
        if profile_name != 'Default':
            options.add_argument(f"--profile-directory={profile_name}")
            
        options.add_argument("--no-first-run")
        options.add_argument("--no-default-browser-check")
        
        # Create a new Chrome browser instance with the profile
        print(f"Launching Chrome with profile: {profile_name}")
        driver = webdriver.Chrome(options=options)
        return driver
        
    except Exception as e:
        print(f"Failed to launch Chrome with profile: {e}")
        raise

def test_confluence_with_profile():
    """Test if we can access Confluence using the user's Chrome profile"""
    driver = None
    try:
        print("\n=== CONFLUENCE PROFILE ACCESS TEST ===")
        
        # Load configuration
        config = load_config()
        confluence_url = config['Confluence']['page_url']
        print(f"Target URL: {confluence_url}")
        
        # Get Chrome with user profile
        print("Launching Chrome with your profile...")
        driver = get_chrome_with_profile()
        
        # Navigate to the Confluence page
        print(f"Navigating to Confluence page...")
        driver.get(confluence_url)
        
        # Check if we're on a login page
        if "login" in driver.current_url.lower():
            print("⚠️ Login page detected - you are not already logged in with this profile")
            print("   You may need to manually log in to Confluence in Chrome first")
            driver.save_screenshot("login_screen.png")
            print("   Screenshot saved to login_screen.png")
            return False
        
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
        screenshot_file = "test_profile_screenshot.png"
        driver.save_screenshot(screenshot_file)
        print(f"✅ Screenshot saved to {screenshot_file}")
        
        # Get page title
        page_title = driver.title
        print(f"Page title: {page_title}")
        
        # Check for iframes
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        print(f"Found {len(iframes)} iframes on the page")
        
        print("\n=== TEST RESULTS ===")
        print(f"✅ Successfully loaded: {confluence_url}")
        print(f"✅ Page title: {page_title}")
        print(f"✅ Found {len(iframes)} iframes")
        print(f"✅ Screenshot saved")
        print("\nThe test was successful! Your Chrome profile has access to Confluence.")
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
        
    finally:
        if driver:
            driver.quit()
            print("Browser closed")

if __name__ == "__main__":
    print("This script tests if we can access your Confluence page using your Chrome profile.")
    print("It will launch Chrome using your existing profile where you're already logged in.")
    input("Press Enter to continue...")
    
    success = test_confluence_with_profile()
    
    if success:
        print("\n=== NEXT STEPS ===")
        print("1. Make sure config.ini has all the correct settings")
        print("2. Run the full script: python existing-profile-extractor.py")
    else:
        print("\n=== TROUBLESHOOTING STEPS ===")
        print("1. Open Chrome normally and make sure you're logged into Confluence")
        print("2. Check that the profile_name in config.ini is correct")
        print("3. Close all Chrome windows and try again")
