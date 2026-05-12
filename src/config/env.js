import 'dotenv/config';

export const PORT = process.env.PORT || 3001;
export const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '1h';
export const EXPIRES_IN_SECONDS = Number(process.env.TOKEN_EXPIRES_IN_SECONDS) || 3600;

export const VALID_APPS = {
  airtime: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
  'bill-payments':
    process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
};

export const HOT_RECHARGE_POST_PAYMENT_URL =
  process.env.HOT_RECHARGE_POST_PAYMENT_URL || 'https://asb.azure-api.net/vas/V2/PostPayment';

export const BANKWARE_API_BASE_URL =
  process.env.BANKWARE_API_BASE_URL || 'http://s-bwopenapi.getbucks.co.zw';
