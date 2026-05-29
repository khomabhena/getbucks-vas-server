import { VALID_APPS } from '../config/env.js';
import { tokenRequestSchema } from '../schemas/tokenRequestSchema.js';
import { createSampleToken, issueToken, verifyToken } from '../services/h5.token.service.js';
import { sendError } from '../utils/http.js';

export const requestToken = async (req, res) => {
  const parsed = tokenRequestSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return sendError(res, 400, 'Invalid request body', 'INVALID_REQUEST', parsed.error.issues);
  }

  const { clientId, clientSecret, app, sessionID, userId } = parsed.data;

  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }
  if (!process.env.IBANK_CLIENT_ID || !process.env.IBANK_CLIENT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: IBANK credentials missing', 'SERVER_CONFIG');
  }
  if (clientId !== process.env.IBANK_CLIENT_ID || clientSecret !== process.env.IBANK_CLIENT_SECRET) {
    return sendError(res, 401, 'Invalid client credentials', 'INVALID_CREDENTIALS');
  }
  if (!VALID_APPS[app]) {
    return sendError(res, 400, 'Invalid app parameter', 'INVALID_APP', {
      validApps: Object.keys(VALID_APPS),
    });
  }

  return res.status(200).json(issueToken({ clientId, app, sessionID, userId }));
};

export const validateToken = async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token =
    req.body?.token ||
    req.query.token ||
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) return sendError(res, 401, 'Token required', 'TOKEN_REQUIRED');
  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }

  try {
    const decoded = verifyToken(token);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ valid: true, payload: decoded });
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Token expired', 'TOKEN_EXPIRED');
    }
    return sendError(res, 401, 'Invalid token', 'TOKEN_INVALID');
  }
};

export const getTokenConfig = async (req, res) => {
  return res.status(200).json({
    clientId: process.env.IBANK_CLIENT_ID || '',
    clientSecret: process.env.IBANK_CLIENT_SECRET || '',
    app: 'bill-payments',
    baseUrl: process.env.TOKEN_API_BASE_URL || '',
  });
};

export const getIframeConfig = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    airtimeUrl: process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
    billPaymentsUrl:
      process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app',
  });
};

export const getSampleIframeData = async (req, res) => {
  if (!process.env.JWT_SECRET) {
    return sendError(res, 500, 'Server misconfigured: JWT_SECRET missing', 'SERVER_CONFIG');
  }

  const app = req.query.app || process.env.SAMPLE_APP || 'bill-payments';
  if (!VALID_APPS[app]) {
    return sendError(res, 400, 'Invalid app parameter', 'INVALID_APP', {
      validApps: Object.keys(VALID_APPS),
    });
  }

  return res.status(200).json(createSampleToken(app));
};
