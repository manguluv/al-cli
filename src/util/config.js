import fs from 'fs';
import path from 'path';
import os from 'os';
import toml from 'toml';

const CONFIG_DIR = path.join(os.homedir(), '.al-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.toml');

const DEFAULT_CONFIG = {
  default_currency: 'USD',
  theme: 'light',
  locale: 'en_US',
  kis: {
    app_key: '',
    app_secret: '',
    account_no: '',
    account_product: '01',
    is_mock: true
  }
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readConfig() {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    writeConfig(DEFAULT_CONFIG);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = toml.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed, kis: { ...DEFAULT_CONFIG.kis, ...parsed.kis } };
  } catch (error) {
    console.error(`Error reading config: ${error.message}`);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

function writeConfig(config) {
  ensureConfigDir();

  const tomlString = Object.entries(config)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `[${key}]\n` + Object.entries(value)
          .map(([k, v]) => `${k} = ${typeof v === 'boolean' ? v : `"${v}"`}`)
          .join('\n');
      }
      return `${key} = "${value}"`;
    })
    .join('\n');

  fs.writeFileSync(CONFIG_FILE, tomlString + '\n', 'utf-8');
}

/**
 * KIS API 인증 토큰 발급
 */
export async function getKisToken() {
  const config = readConfig();
  const { app_key, app_secret, is_mock } = config.kis;

  if (!app_key || !app_secret) {
    throw new Error("KIS API 인증 정보가 config.toml에 설정되어 있지 않습니다.");
  }

  const baseUrl = is_mock ? "https://openapivts.koreainvestment.com:29443" : "https://openapi.koreainvestment.com:9443";
  
  const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: app_key,
      appsecret: app_secret,
    })
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`토큰 발급 실패: ${JSON.stringify(data)}`);
  }
  return { token: data.access_token, baseUrl, isMock: is_mock };
}

export { readConfig, writeConfig, CONFIG_DIR, CONFIG_FILE };
