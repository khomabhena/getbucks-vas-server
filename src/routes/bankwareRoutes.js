import express from 'express';
import { BANKWARE_API_BASE_URL } from '../config/env.js';
import { getBankWareTokenCredentials } from '../services/bankwareService.js';
import { proxyBankWareResponse, sendError } from '../utils/http.js';

const router = express.Router();

router.post('/token', async (req, res) => {
  const credentials = getBankWareTokenCredentials();
  if (!credentials.username || !credentials.password || !credentials.systemId) {
    return sendError(
      res,
      500,
      'Server misconfigured: BankWare token credentials missing',
      'SERVER_CONFIG'
    );
  }

  const formData = new URLSearchParams();
  formData.append('grant_type', credentials.grant_type);
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  formData.append('systemId', credentials.systemId);

  try {
    const response = await fetch(`${BANKWARE_API_BASE_URL.replace(/\/$/, '')}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formData.toString(),
    });

    return proxyBankWareResponse(res, response);
  } catch (error) {
    console.error('BankWare token proxy failed:', error);
    return sendError(
      res,
      502,
      error.message || 'BankWare token request failed',
      'BANKWARE_PROXY_ERROR'
    );
  }
});

router.all('/*', async (req, res) => {
  const path = req.params[0] || '';
  const query = req.originalUrl.includes('?') ? `?${req.originalUrl.split('?')[1]}` : '';
  const targetUrl = `${BANKWARE_API_BASE_URL.replace(/\/$/, '')}/${path}${query}`;
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

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: isBodylessMethod ? undefined : JSON.stringify(req.body || {}),
    });

    return proxyBankWareResponse(res, response);
  } catch (error) {
    console.error('BankWare API proxy failed:', error);
    return sendError(
      res,
      502,
      error.message || 'BankWare API request failed',
      'BANKWARE_PROXY_ERROR'
    );
  }
});

export default router;
