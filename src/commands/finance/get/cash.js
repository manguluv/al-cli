import { getKisToken, readConfig } from '../../../util/config.js';

const DOMESTIC_TR_ID_MOCK = "VTTC8434R";
const DOMESTIC_TR_ID_REAL = "TTTC8434R";

export async function getCash() {
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

    const trId = isMock ? DOMESTIC_TR_ID_MOCK : DOMESTIC_TR_ID_REAL;
    const url = `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`;
    const params = new URLSearchParams({
      CANO, ACNT_PRDT_CD, AFHR_FLPR_YN: "N", OFL_YN: "", INQR_DVSN: "02",
      UNPR_DVSN: "01", FUND_STTL_ICLD_YN: "N", FNCG_AMT_AUTO_RDPT_YN: "N",
      PRCS_DVSN: "01", CTX_AREA_FK100: "", CTX_AREA_NK100: ""
    });

    const res = await fetch(`${url}?${params}`, { headers: { ...headers, tr_id: trId } });
    const data = await res.json();

    if (data.rt_cd !== "0") {
      throw new Error(`[${data.msg_cd}] ${data.msg1?.trim()}`);
    }

    const summary = Array.isArray(data.output2) ? data.output2[0] : data.output2;
    const cash = parseInt(summary.prvs_rcdl_excc_amt || 0);

    console.log("\n💰 [보유 현금]");
    console.log(`주문가능현금: ${cash.toLocaleString()} 원`);

  } catch (error) {
    console.error(`❌ 오류 발생: ${error.message}`);
  }
}
