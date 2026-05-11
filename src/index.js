/**
 * GetBucks VAS Server
 * Entry point for the Value Added Services API
 */

import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '1h';
const EXPIRES_IN_SECONDS = Number(process.env.TOKEN_EXPIRES_IN_SECONDS) || 3600;
const VALID_APPS = {
  airtime: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
  'bill-payments':
    process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
};
const HOT_RECHARGE_POST_PAYMENT_URL =
  process.env.HOT_RECHARGE_POST_PAYMENT_URL || 'https://asb.azure-api.net/vas/V2/PostPayment';
const BANKWARE_API_BASE_URL =
  process.env.BANKWARE_API_BASE_URL || 'http://s-bwopenapi.getbucks.co.zw';

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('combined'));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, IFS-Program-Id'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

const isRateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';


const tokenRequestSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  app: z.enum(['airtime', 'bill-payments']),
  sessionID: z.string().min(1),
  userId: z.string().min(1).optional(),
});

const sendError = (res, status, message, code, details) => {
  const payload = { error: message };
  if (code) payload.code = code;
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

const proxyBankWareResponse = async (res, response) => {
  const responseText = await response.text().catch(() => '');
  if (!responseText) {
    return res.sendStatus(response.status);
  }

  try {
    return res.status(response.status).json(JSON.parse(responseText));
  } catch {
    return res.status(response.status).send(responseText);
  }
};

const getBankWareTokenCredentials = () => ({
  grant_type: process.env.BANKWARE_GRANT_TYPE || 'password',
  username: process.env.BANKWARE_USERNAME || '',
  password: process.env.BANKWARE_PASSWORD || '',
  systemId: process.env.BANKWARE_SYSTEM_ID || '',
});

// Routes
app.get('/', (req, res) => {
  res.send('Getbucks Vas Server Working');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/tester', (req, res) => {
  res.sendFile('tester.html', { root: 'public' });
});

app.get('/iframe-tester', (req, res) => {
  res.sendFile('iframe-tester.html', { root: 'public' });
});

app.post('/api/token/request', (req, res) => {
  const parsed = tokenRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, 'Invalid request body', 'INVALID_REQUEST', parsed.error.issues);
  }

  const { clientId, clientSecret, app: requestedApp, sessionID, userId } = parsed.data;

  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }

  if (!process.env.IBANK_CLIENT_ID || !process.env.IBANK_CLIENT_SECRET) {
    return sendError(
      res,
      500,
      'Server misconfigured: IBANK_CLIENT_ID or IBANK_CLIENT_SECRET missing',
      'SERVER_CONFIG'
    );
  }

  if (
    clientId !== process.env.IBANK_CLIENT_ID ||
    clientSecret !== process.env.IBANK_CLIENT_SECRET
  ) {
    return sendError(res, 401, 'Invalid client credentials', 'INVALID_CREDENTIALS');
  }

  if (!VALID_APPS[requestedApp]) {
    return sendError(res, 400, 'Invalid app parameter', 'INVALID_APP', {
      validApps: Object.keys(VALID_APPS),
    });
  }

  const tokenPayload = {
    clientId,
    app: requestedApp,
    sessionID,
    userId: userId || null,
    issuedAt: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRES_IN,
  });

  return res.status(200).json({
    success: true,
    token,
    expiresIn: EXPIRES_IN_SECONDS,
    baseUrl: VALID_APPS[requestedApp],
    app: requestedApp,
  });
});

app.get('/api/validate-token', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const tokenFromHeader = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;
  const token = req.query.token || tokenFromHeader;

  if (!token) {
    return sendError(res, 401, 'Token required', 'TOKEN_REQUIRED');
  }

  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ valid: true, payload: decoded });
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired', 'TOKEN_EXPIRED');
    }
    return sendError(res, 401, 'Invalid token', 'TOKEN_INVALID');
  }
});

app.get('/api/tester-config', (req, res) => {
  return res.status(200).json({
    clientId: process.env.IBANK_CLIENT_ID || '',
    clientSecret: process.env.IBANK_CLIENT_SECRET || '',
    app: 'bill-payments',
    baseUrl: process.env.TOKEN_API_BASE_URL || '',
  });
});

app.get('/api/iframe-config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    airtimeUrl: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
    billPaymentsUrl:
      process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
  });
});

app.get('/api/sample-iframe-data', (req, res) => {
  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }

  const sampleApp = req.query.app || process.env.SAMPLE_APP || 'bill-payments';
  if (!VALID_APPS[sampleApp]) {
    return sendError(res, 400, 'Invalid app parameter', 'INVALID_APP', {
      validApps: Object.keys(VALID_APPS),
    });
  }

  const sample = {
    accountNumber: process.env.SAMPLE_ACCOUNT_NUMBER || '00001203',
    clientNumber: process.env.SAMPLE_CLIENT_NUMBER || '023557',
    sessionID: process.env.SAMPLE_SESSION_ID || 'sample-session-guid',
  };

  const tokenPayload = {
    clientId: process.env.IBANK_CLIENT_ID || 'sample-client-id',
    app: sampleApp,
    sessionID: sample.sessionID,
    userId: 'sample-user',
    issuedAt: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: TOKEN_EXPIRES_IN,
  });

  return res.status(200).json({
    token,
    accountNumber: sample.accountNumber,
    clientNumber: sample.clientNumber,
    app: sampleApp,
    appBaseUrl: VALID_APPS[sampleApp],
  });
});

app.post('/api/getbucks/token', async (req, res) => {
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

app.all('/api/getbucks/*', async (req, res) => {
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

app.post('/api/hot-recharge/post-payment', async (req, res) => {
  if (!process.env.HOT_RECHARGE_SUBSCRIPTION_KEY) {
    return sendError(
      res,
      500,
      'Server misconfigured: HOT_RECHARGE_SUBSCRIPTION_KEY missing',
      'SERVER_CONFIG'
    );
  }

  if (!process.env.HOT_RECHARGE_MERCHANT_ID || !process.env.HOT_RECHARGE_SIGNATURE) {
    return sendError(
      res,
      500,
      'Server misconfigured: HOT_RECHARGE_MERCHANT_ID or HOT_RECHARGE_SIGNATURE missing',
      'SERVER_CONFIG'
    );
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return sendError(res, 400, 'Invalid PostPayment payload', 'INVALID_REQUEST');
  }

  try {
    const response = await fetch(HOT_RECHARGE_POST_PAYMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Ocp-Apim-Subscription-Key': process.env.HOT_RECHARGE_SUBSCRIPTION_KEY,
        MerchantId: process.env.HOT_RECHARGE_MERCHANT_ID,
        RequestTimestamp: String(Date.now()),
        Signature: process.env.HOT_RECHARGE_SIGNATURE,
      },
      body: JSON.stringify(req.body),
    });

    const responseText = await response.text().catch(() => '');
    let responseData = {};
    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { rawResponse: responseText };
      }
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          responseData.ResultMessage ||
          responseData.Message ||
          responseData.error ||
          responseData.message ||
          response.statusText,
        code: 'HOT_RECHARGE_POST_PAYMENT_FAILED',
        details: responseData,
      });
    }

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Hot Recharge PostPayment proxy failed:', error);
    return sendError(
      res,
      502,
      error.message || 'Hot Recharge PostPayment request failed',
      'HOT_RECHARGE_PROXY_ERROR'
    );
  }
});

app.use('/api', (req, res) => {
  return sendError(res, 404, 'Not found', 'NOT_FOUND');
});

// Error handler
app.use((err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Invalid JSON payload', 'INVALID_JSON');
  }
  console.error('Unhandled error:', err);
  return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
});

// Start server
app.listen(PORT, () => {
  console.log(`Getbucks Vas Server Working`);
  console.log(`Server running on http://localhost:${PORT}`);
});

