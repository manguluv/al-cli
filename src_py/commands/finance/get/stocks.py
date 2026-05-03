import requests
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../../'))
from src_py.util.config import get_kis_token
import yfinance as yf

DOMESTIC_TR_IDS = {
    "mock": "VTTC8434R",
    "real": "TTTC8434R"
}
OVERSEAS_TR_IDS = {
    "mock": "VTRN3018R",
    "real": "TTTS3012R"
}

def get_stocks():
    try:
        creds = get_kis_token()
        headers = {
            "content-type": "application/json",
            "authorization": "",  # Token fetching logic would go here
            "appkey": creds['app_key'],
            "appsecret": creds['app_secret'],
        }

        # 1. 국내주식 조회
        tr_id = DOMESTIC_TR_IDS["mock"] if creds['is_mock'] else DOMESTIC_TR_IDS["real"]
        headers['tr_id'] = tr_id
        
        d_url = f"{creds['base_url']}/uapi/domestic-stock/v1/trading/inquire-balance"
        params = {
            'CANO': creds['account_no'],
            'ACNT_PRDT_CD': creds['account_product'],
            'AFHR_FLPR_YN': 'N',
            'OFL_YN': '',
            'INQR_DVSN': '02',
            'UNPR_DVSN': '01',
            'FUND_STTL_ICLD_YN': 'N',
            'FNCG_AMT_AUTO_RDPT_YN': 'N',
            'PRCS_DVSN': '01',
            'CTX_AREA_FK100': '',
            'CTX_AREA_NK100': ''
        }
        
        print("🔍 국내 주식 조회 중... (현재는 로직만 구현됨)")
        # d_res = requests.get(d_url, headers=headers, params=params)
        # d_stocks = d_res.json().get('output1', [])

        # 2. 해외주식 조회 (미국)
        tr_id = OVERSEAS_TR_IDS["mock"] if creds['is_mock'] else OVERSEAS_TR_IDS["real"]
        headers['tr_id'] = tr_id

        o_url = f"{creds['base_url']}/uapi/overseas-stock/v1/trading/inquire-balance"
        params = {
            'CANO': creds['account_no'],
            'ACNT_PRDT_CD': creds['account_product'],
            'OVRS_EXCG_CD': 'NASD',
            'TR_CRCY_CD': 'USD',
            'OVRS_ICLD_EXRS_YN': 'N',
            'PRCS_DVSN': '01',
            'CTX_AREA_FK200': '',
            'CTX_AREA_NK200': ''
        }

        print("🔍 해외 주식 조회 중... (현재는 로직만 구현됨)")
        # o_res = requests.get(o_url, headers=headers, params=params)
        # o_stocks = o_res.json().get('output1', [])

        print("\n✅ al-cli Python 모듈이 정상적으로 로드되었습니다.")
        print("   (실제 API 호출을 위해서는 KIS OAuth 토큰 발급 로직이 추가되어야 합니다)")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    get_stocks()
