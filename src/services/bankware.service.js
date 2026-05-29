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
