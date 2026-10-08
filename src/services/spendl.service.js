import {
  getSpendlCredentials,
  SPENDL_API_BASE_URL,
  SPENDL_TERMINAL_ID,
  SPENDL_TEST_APPLESEED_ACCOUNT_ID,
} from '../config/env.js';
import { parseResponse } from './vas.service.js';

const spendlBaseUrl = () => SPENDL_API_BASE_URL.replace(/\/$/, '');

const spendlHeaders = () => {
  const { subscriptionKey, merchantId, signature } = getSpendlCredentials();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    MerchantId: merchantId,
    RequestTimestamp: String(Date.now()),
    Signature: signature,
  };
};

export const assertSpendlConfigured = () => {
  const { subscriptionKey, merchantId, signature } = getSpendlCredentials();
  const missing = [];
  if (!subscriptionKey) missing.push('SPENDL_SUBSCRIPTION_KEY');
  if (!merchantId) missing.push('SPENDL_MERCHANT_ID');
  if (!signature) missing.push('SPENDL_SIGNATURE');
  return missing;
};

const spendlGet = async (path, query = {}) => {
  const qs = new URLSearchParams(query).toString();
  const response = await fetch(`${spendlBaseUrl()}${path}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: spendlHeaders(),
  });
  return parseResponse(response);
};

const spendlPost = async (path, body) => {
  const response = await fetch(`${spendlBaseUrl()}${path}`, {
    method: 'POST',
    headers: spendlHeaders(),
    body: JSON.stringify(body),
  });
  return parseResponse(response);
};

export const getSpendlProducts = () => spendlGet('/spendl/V2/SpendlProducts');

const cleanIdentifiers = (identifiers) =>
  (Array.isArray(identifiers) ? identifiers : [])
    .map((entry) => ({
      IdentifierFieldName: entry?.IdentifierFieldName,
      IdentifierFieldValue:
        entry?.IdentifierFieldValue == null ? '' : String(entry.IdentifierFieldValue).trim(),
    }))
    .filter((entry) => entry.IdentifierFieldName && entry.IdentifierFieldValue);

/** VAS-style payment body from the H5 apps -> Sp3ndl payment request. */
export const toSpendlPaymentRequest = (body) => ({
  RequestId: body.RequestId,
  AppleseedAccountId: body.AppleseedAccountId || SPENDL_TEST_APPLESEED_ACCOUNT_ID,
  ProductId: String(body.ProductId),
  Currency: body.Currency || 'ZAR',
  Amount: Number(body.Amount) || 0,
  CreditPartyIdentifiers: cleanIdentifiers(body.CreditPartyIdentifiers),
  TerminalId: SPENDL_TERMINAL_ID,
});

export const validateSpendlPayment = (body) =>
  spendlPost('/spendl/V2/ValidateSpendlPayment', toSpendlPaymentRequest(body));

export const postSpendlPayment = (body) =>
  spendlPost('/spendl/V2/PostSpendlPayment', toSpendlPaymentRequest(body));

export const getSpendlPaymentStatus = (requestId) =>
  spendlGet('/spendl/V2/SpendlPaymentStatus', { id: requestId });
