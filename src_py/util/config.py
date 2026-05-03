import os
from dotenv import load_dotenv

def get_kis_token():
    load_dotenv()
    # In a real scenario, this would fetch an access token using app_key/secret
    # For now, we'll return the credentials for the API call
    return {
        "app_key": os.getenv("KIS_APP_KEY"),
        "app_secret": os.getenv("KIS_APP_SECRET"),
        "base_url": os.getenv("KIS_BASE_URL", "https://openapi.koreainvestment.com:9443"),
        "account_no": os.getenv("KIS_ACCOUNT_NO"),
        "account_product": os.getenv("KIS_ACCOUNT_PRODUCT", "01"),
        "is_mock": os.getenv("KIS_USE_MOCK", "true").lower() == "true"
    }
