import requests
import sys
import os
import time

def check_health(url, max_retries=5, retry_delay=2):
    """
    Check if the application is healthy by making a request to the health endpoint.
    Returns True if healthy, False otherwise.
    """
    for attempt in range(max_retries):
        try:
            response = requests.get(f"{url}/_health", timeout=5)
            if response.status_code == 200:
                print(f"Health check passed on attempt {attempt + 1}")
                return True
            else:
                print(f"Health check failed with status code {response.status_code}")
        except Exception as e:
            print(f"Health check attempt {attempt + 1} failed: {str(e)}")
        
        if attempt < max_retries - 1:
            print(f"Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
    
    return False

if __name__ == "__main__":
    # Get the URL from environment or use default
    base_url = os.environ.get("HEALTH_CHECK_URL", "http://localhost:8000")
    
    # Check health and exit with appropriate code
    if check_health(base_url):
        sys.exit(0)  # Success
    else:
        sys.exit(1)  # Failure
