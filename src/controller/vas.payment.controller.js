import { assertVasConfigured, postPayment, validatePayment } from '../services/vas.service.js';
import { sendError } from '../utils/http.js';

const assertPaymentBody = (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    sendError(res, 400, 'Invalid payment payload', 'INVALID_REQUEST');
    return false;
  }
  return true;
};

const forwardVasPayment = async (res, promise, errorCode) => {
  const missing = assertVasConfigured();
  if (missing.length) {
    return sendError(res, 500, `Missing: ${missing.join(', ')}`, 'SERVER_CONFIG');
  }

  try {
    const result = await promise;
    if (!result.ok) {
      return res.status(result.status).json({
        error:
          result.data.ResultMessage ||
          result.data.Message ||
          result.data.error ||
          result.statusText,
        code: errorCode,
        details: result.data,
      });
    }
    return res.status(200).json(result.data);
  } catch (error) {
    console.error('VAS payment request failed:', error);
    return sendError(res, 502, error.message || 'VAS request failed', 'VAS_PROXY_ERROR');
  }
};

/** Bill payments / VAS — validate before PostPayment */
export const validateBeforePayment = async (req, res) => {
  if (!assertPaymentBody(req, res)) return;
  return forwardVasPayment(res, validatePayment(req.body), 'VAS_VALIDATE_PAYMENT_FAILED');
};

export const createPayment = async (req, res) => {
  if (!assertPaymentBody(req, res)) return;
  return forwardVasPayment(res, postPayment(req.body), 'VAS_POST_PAYMENT_FAILED');
};
