/**
 * GetBucks VAS Server
 * Entry point for the Value Added Services API
 */

import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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

// Middleware
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static('public'));
app.use(morgan('combined'));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

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

app.post('/api/token/request', tokenLimiter, (req, res) => {
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

