import { assertVasConfigured, postPayment, validatePayment } from '../services/vas.service.js';
import { enrichPaymentBody } from '../services/paymentEnrichment.service.js';
import { CreditPartyError } from '../utils/creditParty.js';
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

const handlePayment = async (req, res, vasCall, errorCode) => {
  if (!assertPaymentBody(req, res)) return;

  try {
    const enrichedBody = await enrichPaymentBody(req.body);
    return forwardVasPayment(res, vasCall(enrichedBody), errorCode);
  } catch (error) {
    if (error instanceof CreditPartyError) {
      return sendError(res, 400, error.message, 'CREDIT_PARTY_IDENTIFIER_ERROR', {
        field: error.fieldName || null,
      });
    }
    console.error('Payment enrichment failed:', error);
    return sendError(res, 500, error.message || 'Payment enrichment failed', 'PAYMENT_ENRICHMENT_ERROR');
  }
};

/** Bill payments / VAS — validate before PostPayment */
export const validateBeforePayment = async (req, res) =>
  handlePayment(req, res, validatePayment, 'VAS_VALIDATE_PAYMENT_FAILED');

export const createPayment = async (req, res) =>
  handlePayment(req, res, postPayment, 'VAS_POST_PAYMENT_FAILED');
