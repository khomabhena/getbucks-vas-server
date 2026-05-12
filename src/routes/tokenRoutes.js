import express from 'express';
import jwt from 'jsonwebtoken';
import { EXPIRES_IN_SECONDS, TOKEN_EXPIRES_IN, VALID_APPS } from '../config/env.js';
import { tokenRequestSchema } from '../schemas/tokenRequestSchema.js';
import { sendError } from '../utils/http.js';

const router = express.Router();

router.post('/token/request', (req, res) => {
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

router.get('/validate-token', (req, res) => {
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

router.get('/tester-config', (req, res) => {
  return res.status(200).json({
    clientId: process.env.IBANK_CLIENT_ID || '',
    clientSecret: process.env.IBANK_CLIENT_SECRET || '',
    app: 'bill-payments',
    baseUrl: process.env.TOKEN_API_BASE_URL || '',
  });
});

router.get('/iframe-config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    airtimeUrl: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
    billPaymentsUrl:
      process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
  });
});

router.get('/sample-iframe-data', (req, res) => {
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

export default router;
