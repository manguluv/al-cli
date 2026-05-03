import { readConfig } from '../../../util/config.js';

export function getCash() {
  const config = readConfig();
  console.log(`Fetching cash in ${config.default_currency}...`);
  console.log(`Theme: ${config.theme}, Locale: ${config.locale}`);
}
