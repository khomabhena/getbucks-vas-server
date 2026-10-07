import 'dotenv/config';

export const PORT = process.env.PORT || 3001;
export const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '1h';
export const EXPIRES_IN_SECONDS = Number(process.env.TOKEN_EXPIRES_IN_SECONDS) || 3600;

export const VALID_APPS = {
  airtime: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
  'bill-payments':
    process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
};

export const BANKWARE_API_BASE_URL =
  process.env.BANKWARE_API_BASE_URL || 'http://s-bwopenapi.getbucks.co.zw';

export const VAS_API_BASE_URL =
  process.env.VAS_API_BASE_URL ||
  process.env.HOT_RECHARGE_API_BASE_URL ||
  'https://vas-live.azurewebsites.net';

/** @deprecated Use VAS_API_BASE_URL + /V2/PostPayment */
export const HOT_RECHARGE_POST_PAYMENT_URL =
  process.env.HOT_RECHARGE_POST_PAYMENT_URL ||
  `${VAS_API_BASE_URL.replace(/\/$/, '')}/V2/PostPayment`;

export const getVasCredentials = () => ({
  subscriptionKey:
    process.env.VAS_SUBSCRIPTION_KEY || process.env.HOT_RECHARGE_SUBSCRIPTION_KEY || '',
  merchantId: process.env.VAS_MERCHANT_ID || process.env.HOT_RECHARGE_MERCHANT_ID || '',
  signature: process.env.VAS_SIGNATURE || process.env.HOT_RECHARGE_SIGNATURE || '',
});

/** Sp3ndl (South Africa) via the Appleseed SuperAppGateway. */
export const SPENDL_API_BASE_URL =
  process.env.SPENDL_API_BASE_URL || 'https://appleseed-uat2.azurewebsites.net';

export const getSpendlCredentials = () => ({
  subscriptionKey: process.env.SPENDL_SUBSCRIPTION_KEY || '',
  merchantId: process.env.SPENDL_MERCHANT_ID || '',
  signature: process.env.SPENDL_SIGNATURE || '',
});

/** Hide Sp3ndl test products (provider MOCK), e.g. in production. */
export const SPENDL_HIDE_MOCK_PRODUCTS = process.env.SPENDL_HIDE_MOCK_PRODUCTS === 'true';

/** POS defaults for upstream PostPayment (matches live Postman / till configuration). */
export const getVasPosDefaults = () => ({
  paymentChannel: process.env.VAS_PAYMENT_CHANNEL || 'CASH',
  storeId: process.env.VAS_POS_STORE_ID || 'KWAMEH',
  terminalId: process.env.VAS_POS_TERMINAL_ID || 'Terminal 23',
  cashierId: process.env.VAS_POS_CASHIER_ID || 'Monzeni S',
  customerId: process.env.VAS_CUSTOMER_ID || 'WALKINCUSTOMER',
});
