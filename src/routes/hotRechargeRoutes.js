import express from 'express';
import { HOT_RECHARGE_POST_PAYMENT_URL } from '../config/env.js';
import { sendError } from '../utils/http.js';

const router = express.Router();

router.post('/post-payment', async (req, res) => {
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

export default router;
