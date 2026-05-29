import jwt from 'jsonwebtoken';
import { EXPIRES_IN_SECONDS, TOKEN_EXPIRES_IN, VALID_APPS } from '../config/env.js';

export const issueToken = ({ clientId, app, sessionID, userId }) => {
  const token = jwt.sign(
    {
      clientId,
      app,
      sessionID,
      userId: userId || null,
      issuedAt: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  return {
    success: true,
    token,
    expiresIn: EXPIRES_IN_SECONDS,
    baseUrl: VALID_APPS[app],
    app,
  };
};

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const createSampleToken = (app) => {
  const sample = {
    accountNumber: process.env.SAMPLE_ACCOUNT_NUMBER || '00001203',
    clientNumber: process.env.SAMPLE_CLIENT_NUMBER || '023557',
    sessionID: process.env.SAMPLE_SESSION_ID || 'sample-session-guid',
  };

  const token = jwt.sign(
    {
      clientId: process.env.IBANK_CLIENT_ID || 'sample-client-id',
      app,
      sessionID: sample.sessionID,
      userId: 'sample-user',
      issuedAt: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  return {
    token,
    accountNumber: sample.accountNumber,
    clientNumber: sample.clientNumber,
    app,
    appBaseUrl: VALID_APPS[app],
  };
};
