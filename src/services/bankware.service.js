import { BANKWARE_API_BASE_URL } from '../config/env.js';

export const getBankWareTokenCredentials = () => ({
  grant_type: process.env.BANKWARE_GRANT_TYPE || 'password',
  username: process.env.BANKWARE_USERNAME || '',
  password: process.env.BANKWARE_PASSWORD || '',
  systemId: process.env.BANKWARE_SYSTEM_ID || '',
});

const baseUrl = () => BANKWARE_API_BASE_URL.replace(/\/$/, '');

export const requestBankWareToken = async () => {
  const credentials = getBankWareTokenCredentials();
  const formData = new URLSearchParams();
  formData.append('grant_type', credentials.grant_type);
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  formData.append('systemId', credentials.systemId);

  return fetch(`${baseUrl()}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
  });
};

const parseJsonResponse = async (response) => {
  const text = await response.text().catch(() => '');
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawResponse: text };
    }
  }
  return { ok: response.ok, status: response.status, statusText: response.statusText, data };
};

export const getBankWareAccessToken = async () => {
  const response = await requestBankWareToken();
  const parsed = await parseJsonResponse(response);

  if (!parsed.ok) {
    const message = parsed.data.error_description || parsed.data.error || parsed.statusText;
    throw new Error(message || 'BankWare token failed');
  }

  const accessToken = parsed.data.access_token;
  if (!accessToken) {
    throw new Error('BankWare token response missing access_token');
  }

  return accessToken;
};

export const getAccountByNumber = async (accountNumber) => {
  const accessToken = await getBankWareAccessToken();
  const response = await fetch(`${baseUrl()}/api/v2/accounts/${encodeURIComponent(accountNumber)}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseJsonResponse(response);
};

export const proxyBankWareRequest = async (req) => {
  const path = req.params[0] || '';
  const query = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
  const targetUrl = `${baseUrl()}/${path}${query}`;
  const isBodylessMethod = req.method === 'GET' || req.method === 'HEAD';

  const headers = {
    Accept: req.get('Accept') || 'application/json',
  };

  const authorization = req.get('Authorization');
  if (authorization) {
    headers.Authorization = authorization;
  }

  const ifsProgramId = req.get('IFS-Program-Id');
  if (ifsProgramId) {
    headers['IFS-Program-Id'] = ifsProgramId;
  }

  if (!isBodylessMethod) {
    headers['Content-Type'] = req.get('Content-Type') || 'application/json';
  }

  return fetch(targetUrl, {
    method: req.method,
    headers,
    body: isBodylessMethod ? undefined : JSON.stringify(req.body || {}),
  });
};
