import sys
import os
import json
import requests
import yfinance as yf
from datetime import datetime

# 루트 경로 설정 (상대적 임포트 문제 해결)
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../'))
from src_py.util.config import get_kis_info, load_config, load_token_cache, save_token_cache

DOMESTIC_TR_IDS = {
    "mock": "VTTC8434R",
    "real": "TTTC8434R"
}
OVERSEAS_TR_IDS = {
    "mock": "VTRN3018R",
    "real": "TTTS3012R"
}

def get_oauth_token(kis_info):
    """
    KIS API OAuth 토큰을 발급받습니다. (캐싱 지원)
    """
    cached = load_token_cache()
    if cached and cached.get('expiresAt', 0) > datetime.now().timestamp() * 1000:
        print("✅ 캐시된 토큰을 사용합니다.")
        return cached['token']

    base_url = kis_info['base_url']
    if not base_url:
        base_url = "https://openapivts.koreainvestment.com:29443" if kis_info['is_mock'] else "https://openapi.koreainvestment.com:9443"
        
    url = f"{base_url}/oauth2/tokenP"
    headers = {'content-type': 'application/json'}
    body = {
        "grant_type": "client_credentials",
        "appkey": kis_info['app_key'],
        "appsecret": kis_info['app_secret']
    }
    
    print("🔑 새로운 액세스 토큰을 발급받는 중...")
    res = requests.post(url, headers=headers, json=body)
    res.raise_for_status()
    data = res.json()
    
    token = data['access_token']
    # JS와 호환되는 형식으로 캐시 저장 (24시간 유효)
    save_token_cache({
        'token': token,
        'baseUrl': base_url,
        'isMock': kis_info['is_mock'],
        'expiresAt': datetime.now().timestamp() * 1000 + (24 * 60 * 60 * 1000)
    })
    return token

def fetch_kis_holdings(kis_info, token):
    """
    KIS API를 통해 보유 주식을 조회합니다.
    """
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {token}",
        "appkey": kis_info['app_key'],
        "appsecret": kis_info['app_secret'],
    }

    results = []
    
    # 1. 국내주식 조회
    tr_id = DOMESTIC_TR_IDS["mock"] if kis_info['is_mock'] else DOMESTIC_TR_IDS["real"]
    headers['tr_id'] = tr_id
    
    d_url = f"{kis_info['base_url'] or 'https://openapi.koreainvestment.com:9443'}/uapi/domestic-stock/v1/trading/inquire-balance"
    params = {
        'CANO': kis_info['account_no'],
        'ACNT_PRDT_CD': kis_info['account_product'],
        'AFHR_FLPR_YN': 'N',
        'INQR_DVSN': '02',
        'UNPR_DVSN': '01',
        'FUND_STTL_ICLD_YN': 'N',
        'FNCG_AMT_AUTO_RDPT_YN': 'N',
        'PRCS_DVSN': '01',
        'CTX_AREA_FK100': '',
        'CTX_AREA_NK100': ''
    }
    
    print("🔍 국내 주식 조회 중...")
    try:
        d_res = requests.get(d_url, headers=headers, params=params)
        d_res.raise_for_status()
        d_data = d_res.json()
        results.extend(d_data.get('output1', []))
    except Exception as e:
        print(f"   ⚠️ 국내주식 조회 실패: {e}")

    # 2. 해외주식 조회 (미국)
    tr_id = OVERSEAS_TR_IDS["mock"] if kis_info['is_mock'] else OVERSEAS_TR_IDS["real"]
    headers['tr_id'] = tr_id
    headers['tr_cd'] = '0'

    o_url = f"{kis_info['base_url'] or 'https://openapi.koreainvestment.com:9443'}/uapi/overseas-stock/v1/trading/inquire-balance"
    params = {
        'CANO': kis_info['account_no'],
        'ACNT_PRDT_CD': kis_info['account_product'],
        'OVRS_EXCG_CD': 'NASD',
        'TR_CRCY_CD': 'USD',
        'OVRS_ICLD_EXRS_YN': 'N',
        'PRCS_DVSN': '01',
        'CTX_AREA_FK200': '',
        'CTX_AREA_NK200': ''
    }

    print("🔍 해외 주식 조회 중...")
    try:
        o_res = requests.get(o_url, headers=headers, params=params)
        o_res.raise_for_status()
        o_data = o_res.json()
        results.extend(o_data.get('output1', []))
    except Exception as e:
        print(f"   ⚠️ 해외주식 조회 실패: {e}")
        
    return results

def get_stocks():
    try:
        kis_info = get_kis_info()
        if not kis_info['app_key'] or not kis_info['app_secret']:
            print("❌ KIS API 키가 설정되지 않았습니다. ~/.al-cli/config.toml을 확인해주세요.")
            return

        # 토큰 발급 및 보유 종목 조회 (API 연동)
        token = get_oauth_token(kis_info)
        holdings = fetch_kis_holdings(kis_info, token)
        
        print("\n📊 보유 종목 요약:")
        for item in holdings:
            print(f"   - {item.get('prdt_name', 'N/A')}: {item.get('hldg_qty', 0)}주")

        print("\n✅ Python API 연동 완료")
        print("   (yfinance를 활용한 실시간 시세 조회 등 추가 기능 확장 가능)")
        
        # yfinance 연동 예시 (실시간 시세)
        # ticker = yf.Ticker("AAPL")
        # print(f"   [yfinance] AAPL 현재가: ${ticker.info.get('currentPrice')}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    get_stocks()
