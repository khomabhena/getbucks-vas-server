import { VALID_APPS } from '../config/env.js';
import { getBankwareMerchantAccount } from '../services/bankwareConfig.service.js';
import { sendError } from '../utils/http.js';

export const getMerchantAccount = async (req, res) => {
  const app = String(req.query.app || 'bill-payments').trim().toLowerCase();
  const currency = req.query.currency
    ? String(req.query.currency).trim().toUpperCase()
    : undefined;

  if (!VALID_APPS[app]) {
    return sendError(res, 400, 'Invalid app parameter', 'INVALID_APP', {
      validApps: Object.keys(VALID_APPS),
    });
  }

  const merchantAccount = getBankwareMerchantAccount(app, currency);

  if (!merchantAccount) {
    return sendError(
      res,
      503,
      'Merchant account not configured on server',
      'MERCHANT_ACCOUNT_NOT_CONFIGURED',
      {
        app,
        currency: currency || null,
      }
    );
  }

  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.status(200).json({
    app,
    currency: currency || null,
    merchantAccount,
  });
};
