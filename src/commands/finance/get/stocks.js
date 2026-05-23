import { getKisToken, readConfig } from '../../../util/config.js';
import * as yahooFinance from 'yahoo-finance2';

const DOMESTIC_TR_ID_MOCK = "VTTC8434R";
const DOMESTIC_TR_ID_REAL = "TTTC8434R";
const OVERSEAS_TR_ID_MOCK = "VTRN3018R";
const OVERSEAS_TR_ID_REAL = "TTTS3012R";

let yf;
try {
  yf = new yahooFinance.default({ suppressNotices: ['yahooSurvey'] });
} catch (e) {
  yf = yahooFinance.default;
}

async function fetchYahooPrice(ticker) {
  const quote = await yf.quote(ticker);
  const price = parseFloat(quote.regularMarketPrice || 0);
  if (isNaN(price) || price === 0) throw new Error('Invalid price');
  return price;
}

async function fetchKrwExchangeRate() {
  try {
    // Yahoo Finance에서 USD/KRW 환율 조회 (KRW=X 심볼)
    const quote = await yf.quote('KRW=X');
    const rate = parseFloat(quote.regularMarketPrice || 0);
    if (isNaN(rate) || rate === 0) throw new Error('Invalid exchange rate');
    return rate;
  } catch (error) {
    console.error(`⚠️  환율 조회 실패: ${error.message} (기본값 1400 사용)`);
    return 1400; // 폴백 기본값
  }
}

export async function getStocks() {
  try {
    const { token, baseUrl, isMock } = await getKisToken();
    const config = readConfig();
    const { account_no: CANO, account_product: ACNT_PRDT_CD } = config.kis;

    const headers = {
      "content-type": "application/json",
      "authorization": `Bearer ${token}`,
      "appkey": config.kis.app_key,
      "appsecret": config.kis.app_secret,
    };

    // 1. 국내주식 조회
    const dTrId = isMock ? DOMESTIC_TR_ID_MOCK : DOMESTIC_TR_ID_REAL;
    const dUrl = `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`;
    const dParams = new URLSearchParams({
      CANO, ACNT_PRDT_CD, AFHR_FLPR_YN: "N", OFL_YN: "", INQR_DVSN: "02",
      UNPR_DVSN: "01", FUND_STTL_ICLD_YN: "N", FNCG_AMT_AUTO_RDPT_YN: "N",
      PRCS_DVSN: "01", CTX_AREA_FK100: "", CTX_AREA_NK100: ""
    });

    const dRes = await fetch(`${dUrl}?${dParams}`, { headers: { ...headers, tr_id: dTrId } });
    const dData = await dRes.json();
    const dStocks = dData.output1 || [];

    // 2. 해외주식 조회 (미국)
    const oTrId = isMock ? OVERSEAS_TR_ID_MOCK : OVERSEAS_TR_ID_REAL;
    const oUrl = `${baseUrl}/uapi/overseas-stock/v1/trading/inquire-balance`;
    const oParams = new URLSearchParams({
      CANO, ACNT_PRDT_CD, OVRS_EXCG_CD: "NASD", TR_CRCY_CD: "USD",
      OVRS_ICLD_EXRS_YN: "Y", PRCS_DVSN: "01", CTX_AREA_FK200: "", CTX_AREA_NK200: ""
    });

    const oRes = await fetch(`${oUrl}?${oParams}`, { headers: { ...headers, tr_id: oTrId } });
    const oData = await oRes.json();
    const oStocks = oData.output1 || [];
    
    // Yahoo Finance에서 USD/KRW 환율 조회 (KIS API에 환율 정보 누락 이슈 있음)
    const exchangeRate = await fetchKrwExchangeRate();

    // 3. 출력 포맷팅
    console.log("\n📋 [보유 종목 상세]");
    console.log("-".repeat(100));
    console.log(
      `${"구분".padEnd(10)} | ${"종목명".padEnd(20)} | ${"수량".padEnd(8)} | ${"단가".padEnd(15)} | ${"평가금액".padEnd(15)} | ${"손익".padEnd(15)}`
    );
    console.log("-".repeat(100));

    let totalEval = 0;
    let totalProfit = 0;

    for (const s of dStocks) {
      const qty = parseInt(s.hldg_qty || 0);
      if (qty === 0) continue;
      const price = parseInt(s.prpr || 0);
      const evalAmt = qty * price;
      const profit = parseInt(s.evlu_pfls_amt || 0);
      totalEval += evalAmt;
      totalProfit += profit;

      console.log(
        `${"국내".padEnd(10)} | ${(s.prdt_name || "unknown").padEnd(20)} | ${qty.toString().padEnd(8)} | ${price.toLocaleString().padEnd(15)} | ${evalAmt.toLocaleString().padEnd(15)} | ${profit.toLocaleString().padEnd(15)}`
      );
    }

    for (const s of oStocks) {
      const qty = parseInt(s.ovrs_cblc_qty || 0);
      if (qty === 0) continue;
      let price = parseFloat(s.ovrs_now_pric || 0);
      const ticker = s.ovrs_pdno;
      let usedYahoo = false;

      if (price === 0 && ticker) {
        try {
          price = await fetchYahooPrice(ticker);
          usedYahoo = true;
        } catch (err) {
          console.error(`⚠️  yfinance 실패 (${ticker}): ${err.message}`);
        }
      }

      // 달러 단가를 원화로 환산
      const priceKRW = price * exchangeRate;
      const avgPrice = parseFloat(s.pchs_avg_pric || 0);
      
      // 원화 기준 평가금액 및 손익 계산
      const evalAmtKRW = qty * priceKRW;
      const profitKRW = avgPrice > 0 ? (priceKRW - (avgPrice * exchangeRate)) * qty : (parseFloat(s.evlu_pfls_amt || 0) * exchangeRate);
      
      totalEval += evalAmtKRW;
      totalProfit += profitKRW;

      const priceDisplay = usedYahoo ? `${price.toFixed(2)}*` : price.toFixed(2);
      console.log(
        `${"해외(미국)".padEnd(10)} | ${(s.ovrs_item_name || ticker).padEnd(20)} | ${qty.toString().padEnd(8)} | ${`$${priceDisplay}`.padEnd(15)} | ${`₩${Math.round(evalAmtKRW).toLocaleString()}`.padEnd(15)} | ${`₩${Math.round(profitKRW).toLocaleString()}`.padEnd(15)}`
      );
    }
    
    console.log("-".repeat(100));
    console.log(`총 평가금액: ${totalEval.toLocaleString()} ${isMock ? "(Mock)" : ""}`);
    console.log(`총 평가손익: ${totalProfit.toLocaleString()} ${isMock ? "(Mock)" : ""}`);

  } catch (error) {
    console.error(`❌ 오류 발생: ${error.message}`);
  }
}
