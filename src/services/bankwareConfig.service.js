import { VALID_APPS } from '../config/env.js';

const APP_ENV_KEYS = {
  airtime: 'BANKWARE_MERCHANT_ACCOUNT_AIRTIME',
  'bill-payments': 'BANKWARE_MERCHANT_ACCOUNT_BILL_PAYMENTS',
};

const CURRENCY_ALIASES = {
  ZWG: ['ZWG', 'ZWL', 'ZIG'],
  ZWL: ['ZWG', 'ZWL', 'ZIG'],
  ZIG: ['ZWG', 'ZWL', 'ZIG'],
};

function normalizeApp(app) {
  const value = String(app || 'bill-payments').trim().toLowerCase();
  return VALID_APPS[value] ? value : 'bill-payments';
}

function normalizeCurrency(currency) {
  return String(currency || '').trim().toUpperCase();
}

function readEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : '';
}

function resolveCurrencyEnv(baseName, currency) {
  if (!currency) return '';

  const candidates = [currency, ...(CURRENCY_ALIASES[currency] || [])];
  const seen = new Set();

  for (const code of candidates) {
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const value = readEnv(`${baseName}_${code}`);
    if (value) return value;
  }

  return '';
}

/**
 * Resolve BankWare credit (merchant) account for an H5 app and optional currency.
 * Precedence: app+currency → app default → global+currency → global default.
 */
export function getBankwareMerchantAccount(app = 'bill-payments', currency) {
  const normalizedApp = normalizeApp(app);
  const normalizedCurrency = normalizeCurrency(currency);
  const appEnvKey = APP_ENV_KEYS[normalizedApp];

  if (normalizedCurrency) {
    const appCurrencyAccount = resolveCurrencyEnv(appEnvKey, normalizedCurrency);
    if (appCurrencyAccount) return appCurrencyAccount;

    const globalCurrencyAccount = resolveCurrencyEnv(
      'BANKWARE_MERCHANT_ACCOUNT',
      normalizedCurrency
    );
    if (globalCurrencyAccount) return globalCurrencyAccount;
  }

  const appAccount = readEnv(appEnvKey);
  if (appAccount) return appAccount;

  return readEnv('BANKWARE_MERCHANT_ACCOUNT');
}
