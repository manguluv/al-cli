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
};

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function getDefaultConfig() {
  return DEFAULT_CONFIG;
}

function readConfig() {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    writeConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = toml.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (error) {
    console.error(`Error reading config: ${error.message}`);
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config) {
  ensureConfigDir();

  const tomlString = Object.entries(config)
    .map(([key, value]) => `${key} = "${value}"`)
    .join('\n');

  fs.writeFileSync(CONFIG_FILE, tomlString + '\n', 'utf-8');
}

export { readConfig, writeConfig, getDefaultConfig, CONFIG_DIR, CONFIG_FILE };
