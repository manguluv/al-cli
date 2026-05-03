import os
import json
import toml
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

def get_token_cache_path():
    return Path.home() / '.al-cli' / 'token_cache.json'

def load_token_cache():
    """
    JS에서 작성한 token_cache.json을 읽어옵니다.
    """
    cache_path = get_token_cache_path()
    if cache_path.exists():
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    return None

def save_token_cache(cache_data):
    """
    발급된 토큰을 JS와 공유하는 cache에 저장합니다.
    """
    cache_path = get_token_cache_path()
    with open(cache_path, 'w', encoding='utf-8') as f:
        json.dump(cache_data, f, indent=2)

def load_config():
    """
    JS와 공유하는 ~/.al-cli/config.toml 파일을 읽어옵니다.
    """
    config_path = Path.home() / '.al-cli' / 'config.toml'
    if not config_path.exists():
        # 기본 설정 반환 (JS의 DEFAULT_CONFIG와 동기화)
        return {
            'default_currency': 'USD',
            'theme': 'light',
            'locale': 'en_US',
            'kis': {
                'app_key': '',
                'app_secret': '',
                'account_no': '',
                'account_product': '01',
                'is_mock': True
            }
        }
    
    with open(config_path, 'r', encoding='utf-8') as f:
        return toml.load(f)

def get_kis_info():
    load_dotenv()
    config = load_config()
    kis = config.get('kis', {})
    
    # 환경변수가 있으면 설정 파일보다 우선 사용 (보안상)
    return {
        "app_key": os.getenv("KIS_APP_KEY", kis.get('app_key', '')),
        "app_secret": os.getenv("KIS_APP_SECRET", kis.get('app_secret', '')),
        "base_url": os.getenv("KIS_BASE_URL"),
        "account_no": os.getenv("KIS_ACCOUNT_NO", kis.get('account_no', '')),
        "account_product": os.getenv("KIS_ACCOUNT_PRODUCT", kis.get('account_product', '01')),
        "is_mock": os.getenv("KIS_USE_MOCK", str(kis.get('is_mock', True))).lower() in ['true', '1']
    }
