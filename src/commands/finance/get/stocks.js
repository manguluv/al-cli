import { readConfig } from '../../../util/config.js';

export function getStocks() {
  const config = readConfig();
  console.log(`Fetching stocks in ${config.default_currency}...`);
  console.log(`Theme: ${config.theme}, Locale: ${config.locale}`);
}
