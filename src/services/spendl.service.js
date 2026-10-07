import { getSpendlCredentials, SPENDL_API_BASE_URL } from '../config/env.js';
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

export const getSpendlProducts = () => spendlGet('/spendl/V2/SpendlProducts');
