import { getVasCredentials, VAS_API_BASE_URL } from '../config/env.js';

const vasBaseUrl = () => VAS_API_BASE_URL.replace(/\/$/, '');

const vasHeaders = () => {
  const { subscriptionKey, merchantId, signature } = getVasCredentials();
  return {
    Accept: 'text/plain',
    'Ocp-Apim-Subscription-Key': subscriptionKey,
    MerchantId: merchantId,
    RequestTimestamp: String(Date.now()),
    Signature: signature,
  };
};

export const parseResponse = async (response) => {
  const responseText = await response.text().catch(() => '');
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { rawResponse: responseText };
    }
  }
  return { ok: response.ok, status: response.status, statusText: response.statusText, data };
};

export const assertVasConfigured = () => {
  const { subscriptionKey, merchantId, signature } = getVasCredentials();
  const missing = [];
  if (!subscriptionKey) missing.push('VAS_SUBSCRIPTION_KEY');
  if (!merchantId) missing.push('VAS_MERCHANT_ID');
  if (!signature) missing.push('VAS_SIGNATURE');
  return missing;
};

export const vasGet = async (path, query = {}) => {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const url = `${vasBaseUrl()}${path}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: vasHeaders(),
  });

  return parseResponse(response);
};

export const vasPost = async (path, body) => {
  const response = await fetch(`${vasBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      ...vasHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseResponse(response);
};

export const validatePayment = (body) => vasPost('/V2/ValidatePayment', body);

export const postPayment = (body) => vasPost('/V2/PostPayment', body);

/**
 * Official ZB proof-of-payment PDF.
 * Id must be the Receipt Number (not RequestId) from PostPayment DisplayData / ReferenceNumber.
 */
export const downloadReceipt = async (receiptId) => {
  const params = new URLSearchParams({ Id: String(receiptId) });
  const url = `${vasBaseUrl()}/V2/DownloadReceipt?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...vasHeaders(),
      Accept: 'application/pdf',
      'Content-Type': 'application/pdf',
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    let data = {};
    const text = buffer.toString('utf8');
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawResponse: text.slice(0, 500) };
      }
    }
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  }

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    buffer,
    contentType: contentType.includes('pdf') ? contentType : 'application/pdf',
  };
};

export const getServices = (query = {}) => vasGet('/V2/Services', query);

export const getCountries = (service) => vasGet('/V2/Countries', { service });

export const getProducts = (query) => vasGet('/V2/Products', query);

export const getProduct = (id) => vasGet('/V2/Product', { id });

export const getConnect = () => vasGet('/V2/Connect');

export const getServiceProviders = (query) => vasGet('/V2/ServiceProviders', query);
