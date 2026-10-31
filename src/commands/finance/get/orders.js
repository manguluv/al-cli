import { getKisToken, readConfig } from '../../../util/config.js';

// 국내 주식 일별 주문체결조회 TR_ID
const DOMESTIC_TR_ID_REAL_INNER = "TTTC0081R"; // 실전, 3개월 이내
const DOMESTIC_TR_ID_REAL_BEFORE = "CTSC9215R"; // 실전, 3개월 이전
const DOMESTIC_TR_ID_MOCK_INNER = "VTTC0081R"; // 모의, 3개월 이내
const DOMESTIC_TR_ID_MOCK_BEFORE = "VTSC9215R"; // 모의, 3개월 이전

// 해외 주식 주문체결내역 TR_ID
const OVERSEAS_TR_ID_REAL = "TTTS3035R"; // 실전
const OVERSEAS_TR_ID_MOCK = "VTTS3035R"; // 모의

// 3개월(90일) 임계치 (KIS API가 3개월 이내/이전으로 TR_ID를 구분)
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * 오늘 날짜를 YYYYMMDD로 반환
 */
function todayYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * 날짜 문자열(YYYYMMDD)을 3개월 이내/이전 판별
 */
function isWithin3Months(ymd) {
  const target = new Date(
    parseInt(ymd.slice(0, 4)),
    parseInt(ymd.slice(4, 6)) - 1,
    parseInt(ymd.slice(6, 8))
  );
  return (Date.now() - target.getTime()) < THREE_MONTHS_MS;
}

/**
 * 국내 주식 일별 주문체결내역 조회 (연속조회 지원)
 * 
 * 응답 필드 (output1):
 *   ord_dt: 주문일자, ord_tmd: 주문시각, pdno: 종목번호, prdt_name: 종목명
 *   sll_buy_dvsn_cd: 01:매도 02:매수, sll_buy_dvsn_cd_name: 매도매수구분명
 *   ord_dvsn_name: 주문구분명(지정가 등), ord_qty: 주문수량, ord_unpr: 주문단가
 *   tot_ccld_qty: 총체결수량, avg_prvs: 체결평균가격, tot_ccld_amt: 총체결금액
 *   cncl_yn: 취소여부, ccld_cndt_name: 체결조건명, ord_gno_brno: 주문지점번호, odno: 주문번호
 */
async function fetchDomesticOrders(token, baseUrl, isMock, config, startDate, endDate, options = {}) {
  const { account_no: CANO, account_product: ACNT_PRDT_CD } = config.kis;
  const headers = {
    "content-type": "application/json",
    "authorization": `Bearer ${token}`,
    "appkey": config.kis.app_key,
    "appsecret": config.kis.app_secret,
  };

  const withinInner = isWithin3Months(startDate);
  let trId;
  if (isMock) {
    trId = withinInner ? DOMESTIC_TR_ID_MOCK_INNER : DOMESTIC_TR_ID_MOCK_BEFORE;
  } else {
    trId = withinInner ? DOMESTIC_TR_ID_REAL_INNER : DOMESTIC_TR_ID_REAL_BEFORE;
  }

  const url = `${baseUrl}/uapi/domestic-stock/v1/trading/inquire-daily-ccld`;

  let allOrders = [];
  let FK100 = "";
  let NK100 = "";
  let trCont = "";
  let pageCount = 0;
  const maxPages = 10;

  while (pageCount < maxPages) {
    const params = new URLSearchParams({
      CANO, ACNT_PRDT_CD,
      INQR_STRT_DT: startDate,
      INQR_END_DT: endDate,
      SLL_BUY_DVSN_CD: options.sll_buy || "00",  // 00:전체 01:매도 02:매수
      PDNO: options.pdno || "",
      CCLD_DVSN: options.ccld || "00",  // 00:전체 01:체결 02:미체결
      INQR_DVSN: "01",  // 01:정순
      INQR_DVSN_3: "00", // 00:전체
      ORD_GNO_BRNO: "",
      ODNO: "",
      INQR_DVSN_1: "",
      CTX_AREA_FK100: FK100,
      CTX_AREA_NK100: NK100,
    });

    const res = await fetch(`${url}?${params}`, { headers: { ...headers, tr_id: trId, "tr_cont": trCont } });
    const data = await res.json();

    if (data.rt_cd && data.rt_cd !== '0') {
      throw new Error(`국내 주문체결조회 실패: ${data.msg1 || 'unknown'} (rt_cd=${data.rt_cd}, msg_cd=${data.msg_cd || '?'})`);
    }

    const output1 = data.output1 || [];
    allOrders = allOrders.concat(output1);
    pageCount++;

    // 연속조회 확인
    const newTrCont = data.tr_cont || "";
    FK100 = data.ctx_area_fk100 || "";
    NK100 = data.ctx_area_nk100 || "";

    if (newTrCont === "M" || newTrCont === "F") {
      trCont = "N";
    } else {
      break;
    }
  }

  return allOrders;
}

/**
 * 해외 주식 주문체결내역 조회 (연속조회 지원)
 * 
 * 응답 필드 (output[]):
 *   ord_dt: 주문일자, ord_tmd: 주문시각, pdno: 종목번호, prdt_name: 종목명
 *   sll_buy_dvsn_cd: 01:매도 02:매수, sll_buy_dvsn_cd_name: 매도매수구분명
 *   rvse_cncl_dvsn: 정정취소구분, rvse_cncl_dvsn_name: 정정취소구분명
 *   ft_ord_qty: 주문수량, ft_ord_unpr3: 주문단가
 *   ft_ccld_qty: 체결수량, ft_ccld_unpr3: 체결단가, ft_ccld_amt3: 체결금액
 *   nccs_qty: 미체결수량, prcs_stat_name: 처리상태명
 *   tr_crcy_cd: 거래통화코드, tr_mket_name: 거래소명, ovrs_excg_cd: 해외거래소코드
 *   mdia_dvsn_name: 매체구분명, ord_gno_brno: 주문지점번호, odno: 주문번호
 */
async function fetchOverseasOrders(token, baseUrl, isMock, config, startDate, endDate, options = {}) {
  const { account_no: CANO, account_product: ACNT_PRDT_CD } = config.kis;
  const headers = {
    "content-type": "application/json",
    "authorization": `Bearer ${token}`,
    "appkey": config.kis.app_key,
    "appsecret": config.kis.app_secret,
  };

  const trId = isMock ? OVERSEAS_TR_ID_MOCK : OVERSEAS_TR_ID_REAL;
  const url = `${baseUrl}/uapi/overseas-stock/v1/trading/inquire-ccnl`;

  let allOrders = [];
  let FK200 = "";
  let NK200 = "";
  let trCont = "";
  let pageCount = 0;
  const maxPages = 10;

  while (pageCount < maxPages) {
    const params = new URLSearchParams({
      CANO, ACNT_PRDT_CD,
      PDNO: options.pdno || (isMock ? "" : "%"),  // 모의: ""(전체), 실전: "%"(전종목)
      ORD_STRT_DT: startDate,
      ORD_END_DT: endDate,
      SLL_BUY_DVSN: options.sll_buy || "00",  // 00:전체 01:매도 02:매수
      CCLD_NCCS_DVSN: options.ccld || "00",  // 00:전체 01:체결 02:미체결
      OVRS_EXCG_CD: options.ovrs_excg || (isMock ? "" : "%"),  // 모의: ""(전체), 실전: "%"(전체)
      SORT_SQN: "DS",  // DS:정순 AS:역순
      ORD_DT: "",
      ORD_GNO_BRNO: "",
      ODNO: "",
      CTX_AREA_FK200: FK200,
      CTX_AREA_NK200: NK200,
    });

    const res = await fetch(`${url}?${params}`, { headers: { ...headers, tr_id: trId, "tr_cont": trCont } });
    const data = await res.json();

    if (data.rt_cd && data.rt_cd !== '0') {
      throw new Error(`해외 주문체결조회 실패: ${data.msg1 || 'unknown'} (rt_cd=${data.rt_cd}, msg_cd=${data.msg_cd || '?'})`);
    }

    const output = data.output || [];
    const outputArr = Array.isArray(output) ? output : [output];
    allOrders = allOrders.concat(outputArr);
    pageCount++;

    // 연속조회 확인
    const newTrCont = data.tr_cont || "";
    FK200 = data.ctx_area_fk200 || "";
    NK200 = data.ctx_area_nk200 || "";

    if (newTrCont === "M" || newTrCont === "F") {
      trCont = "N";
    } else {
      break;
    }
  }

  return allOrders;
}

/**
 * 날짜 문자열(YYYYMMDD)을 포맷팅 (YYYY-MM-DD)
 */
function fmtDate(ymd) {
  if (!ymd || ymd.length !== 8) return ymd || '-';
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/**
 * 시간 문자열(HHMMSS)을 포맷팅 (HH:MM:SS)
 */
function fmtTime(tmd) {
  if (!tmd || tmd.length !== 6) return tmd || '-';
  return `${tmd.slice(0, 2)}:${tmd.slice(2, 4)}:${tmd.slice(4, 6)}`;
}

/**
 * 숫자 문자열을 천단위 콤마 포맷팅
 */
function fmtNum(val) {
  const n = parseFloat(val || 0);
  return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(2);
}

/**
 * 문자열을 지정 길이로 자르고 패딩
 */
function pad(str, len) {
  const s = String(str || '');
  if (s.length > len) return s.slice(0, len - 1) + '…';
  return s.padEnd(len);
}

/**
 * 매도매수구분 코드 → 표시명
 */
function sellBuyLabel(code) {
  return code === '01' ? '매도' : code === '02' ? '매수' : '전체';
}

export async function getOrders(options = {}) {
  try {
    const { token, baseUrl, isMock } = await getKisToken();
    const config = readConfig();

    // 날짜 범위 설정 (기본: 오늘)
    const endDate = options.end || todayYMD();
    const startDate = options.start || endDate;  // 기본: 당일

    // String → code mapping
    const CCLD_MAP = { 'all': '00', 'filled': '01', 'unfilled': '02' };
    const SLL_BUY_MAP = { 'all': '00', 'sell': '01', 'buy': '02' };

    const ccld = options.ccld ? (CCLD_MAP[options.ccld] || options.ccld) : '00';
    const sllBuy = options.sllBuy ? (SLL_BUY_MAP[options.sllBuy] || options.sllBuy) : '00';

    const queryOptions = { ...options, ccld, sll_buy: sllBuy };

    if (options.json) {
      // JSON 모드
      const domestic = await fetchDomesticOrders(token, baseUrl, isMock, config, startDate, endDate, queryOptions);
      const overseas = await fetchOverseasOrders(token, baseUrl, isMock, config, startDate, endDate, queryOptions);

      const result = [];

      // 국내 주문 정규화
      for (const o of domestic) {
        result.push({
          market: 'KR',
          orderDate: o.ord_dt || '',
          orderTime: o.ord_tmd || '',
          pdno: o.pdno || '',
          productName: o.prdt_name || '',
          sellBuy: o.sll_buy_dvsn_cd || '',
          sellBuyName: o.sll_buy_dvsn_cd_name || '',
          orderType: o.ord_dvsn_name || '',
          orderQty: parseInt(o.ord_qty || 0),
          orderPrice: parseInt(o.ord_unpr || 0),
          filledQty: parseInt(o.tot_ccld_qty || 0),
          avgPrice: parseInt(o.avg_prvs || 0),
          filledAmount: parseInt(o.tot_ccld_amt || 0),
          status: o.ccld_cndt_name || '',
          currency: 'KRW',
        });
      }

      // 해외 주문 정규화
      for (const o of overseas) {
        result.push({
          market: 'US',
          orderDate: o.ord_dt || '',
          orderTime: o.ord_tmd || '',
          pdno: o.pdno || '',
          productName: o.prdt_name || '',
          sellBuy: o.sll_buy_dvsn_cd || '',
          sellBuyName: o.sll_buy_dvsn_cd_name || '',
          orderType: o.rvse_cncl_dvsn_name || '',
          orderQty: parseInt(o.ft_ord_qty || 0),
          orderPrice: parseFloat(o.ft_ord_unpr3 || 0),
          filledQty: parseInt(o.ft_ccld_qty || 0),
          avgPrice: parseFloat(o.ft_ccld_unpr3 || 0),
          filledAmount: parseFloat(o.ft_ccld_amt3 || 0),
          unfulfilledQty: parseInt(o.nccs_qty || 0),
          status: o.prcs_stat_name || '',
          currency: o.tr_crcy_cd || 'USD',
          exchange: o.tr_mket_name || '',
        });
      }

      console.log(JSON.stringify(result));
      return;
    }

    // 테이블 모드
    console.log(`\n📋 [주문체결내역] ${fmtDate(startDate)} ~ ${fmtDate(endDate)} ${isMock ? "(Mock)" : ""}`);
    console.log("-".repeat(140));
    console.log(
      `${pad("구분", 6)} | ${pad("주문일자", 12)} | ${pad("시각", 10)} | ${pad("종목코드", 8)} | ${pad("종목명", 18)} | ${pad("매도/매수", 8)} | ${pad("주문유형", 10)} | ${pad("주문", 8)} | ${pad("체결", 8)} | ${pad("체결평균가", 14)} | ${pad("체결금액", 14)} | ${pad("상태", 8)}`
    );
    console.log("-".repeat(140));

    let hasData = false;

    // 국내 주문
    try {
      const domestic = await fetchDomesticOrders(token, baseUrl, isMock, config, startDate, endDate, queryOptions);
      for (const o of domestic) {
        hasData = true;
        console.log(
          `${pad("국내", 6)} | ${pad(fmtDate(o.ord_dt), 12)} | ${pad(fmtTime(o.ord_tmd), 10)} | ${pad(o.pdno || '', 8)} | ${pad(o.prdt_name || '', 18)} | ${pad(sellBuyLabel(o.sll_buy_dvsn_cd), 8)} | ${pad(o.ord_dvsn_name || '', 10)} | ${pad(fmtNum(o.ord_qty), 8)} | ${pad(fmtNum(o.tot_ccld_qty), 8)} | ${pad(fmtNum(o.avg_prvs), 14)} | ${pad(fmtNum(o.tot_ccld_amt), 14)} | ${pad(o.ccld_cndt_name || '', 8)}`
        );
      }
    } catch (e) {
      console.error(`⚠️  국내 주문조회 오류: ${e.message}`);
    }

    // 해외 주문
    try {
      const overseas = await fetchOverseasOrders(token, baseUrl, isMock, config, startDate, endDate, queryOptions);
      for (const o of overseas) {
        hasData = true;
        const currency = o.tr_crcy_cd || 'USD';
        console.log(
          `${pad("해외", 6)} | ${pad(fmtDate(o.ord_dt), 12)} | ${pad(fmtTime(o.ord_tmd), 10)} | ${pad(o.pdno || '', 8)} | ${pad(o.prdt_name || '', 18)} | ${pad(sellBuyLabel(o.sll_buy_dvsn_cd), 8)} | ${pad(o.rvse_cncl_dvsn_name || o.prcs_stat_name || '', 10)} | ${pad(fmtNum(o.ft_ord_qty), 8)} | ${pad(fmtNum(o.ft_ccld_qty), 8)} | ${pad(parseFloat(o.ft_ccld_unpr3 || 0).toFixed(2) + ' ' + currency, 14)} | ${pad(parseFloat(o.ft_ccld_amt3 || 0).toFixed(2) + ' ' + currency, 14)} | ${pad(o.prcs_stat_name || '', 8)}`
        );
      }
    } catch (e) {
      console.error(`⚠️  해외 주문조회 오류: ${e.message}`);
    }

    console.log("-".repeat(140));
    if (!hasData) {
      console.log("조회된 주문체결 내역이 없습니다.");
    }

  } catch (error) {
    console.error(`❌ 오류 발생: ${error.message}`);
  }
}