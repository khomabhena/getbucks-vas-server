import {
  assertVasConfigured,
  downloadReceipt,
  postPayment,
  validatePayment,
} from '../services/vas.service.js';
import { enrichPaymentBody } from '../services/paymentEnrichment.service.js';
import { isSpendlProductId } from '../services/spendlCatalog.service.js';
import {
  assertSpendlConfigured,
  postSpendlPayment,
  validateSpendlPayment,
} from '../services/spendl.service.js';
import { SPENDL_PAYMENTS_ENABLED, SPENDL_TEST_APPLESEED_ACCOUNT_ID } from '../config/env.js';
import { CreditPartyError } from '../utils/creditParty.js';
import { sendError } from '../utils/http.js';

const assertPaymentBody = (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    sendError(res, 400, 'Invalid payment payload', 'INVALID_REQUEST');
    return false;
  }
  return true;
};

const forwardVasPayment = async (res, promise, errorCode, assertConfigured = assertVasConfigured) => {
  const missing = assertConfigured();
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

/** South Africa (Sp3ndl): validation is always forwarded; purchases only when SPENDL_PAYMENTS_ENABLED. */
const handleSpendlPayment = (req, res, errorCode, stage) => {
  const isPost = stage !== 'validate';

  if (isPost && !SPENDL_PAYMENTS_ENABLED) {
    return sendError(
      res,
      501,
      'South Africa payments are not available yet.',
      'SPENDL_PAYMENTS_NOT_ENABLED'
    );
  }

  if (!req.body.AppleseedAccountId && !SPENDL_TEST_APPLESEED_ACCOUNT_ID) {
    return sendError(
      res,
      501,
      `South Africa ${isPost ? 'payments are' : 'validation is'} not available yet.`,
      'SPENDL_ACCOUNT_NOT_CONFIGURED'
    );
  }

  const call = isPost ? postSpendlPayment : validateSpendlPayment;
  return forwardVasPayment(res, call(req.body), errorCode, assertSpendlConfigured);
};

const handlePayment = async (req, res, vasCall, errorCode, stage) => {
  if (!assertPaymentBody(req, res)) return;

  if (isSpendlProductId(req.body.ProductId)) {
    return handleSpendlPayment(req, res, errorCode, stage);
  }

  try {
    const enrichedBody = await enrichPaymentBody(req.body, { stage });
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
  handlePayment(req, res, validatePayment, 'VAS_VALIDATE_PAYMENT_FAILED', 'validate');

export const createPayment = async (req, res) =>
  handlePayment(req, res, postPayment, 'VAS_POST_PAYMENT_FAILED', 'post');

/** Official ZB PDF proof of payment (Receipt Number from PostPayment as Id). */
export const downloadOfficialReceipt = async (req, res) => {
  const receiptId = String(req.query.id || req.query.Id || '').trim();
  if (!receiptId) {
    return sendError(res, 400, 'Receipt Id is required', 'INVALID_REQUEST');
  }

  const missing = assertVasConfigured();
  if (missing.length) {
    return sendError(res, 500, `Missing: ${missing.join(', ')}`, 'SERVER_CONFIG');
  }

  try {
    const result = await downloadReceipt(receiptId);
    if (!result.ok) {
      return res.status(result.status).json({
        error:
          result.data.ResultMessage ||
          result.data.Message ||
          result.data.error ||
          result.statusText ||
          'Download receipt failed',
        code: 'VAS_DOWNLOAD_RECEIPT_FAILED',
        details: result.data,
      });
    }

    const safeName = receiptId.replace(/[^\w.-]+/g, '_').slice(0, 80);
    res.setHeader('Content-Type', result.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="proof-of-payment-${safeName}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(result.buffer);
  } catch (error) {
    console.error('VAS download receipt failed:', error);
    return sendError(res, 502, error.message || 'VAS request failed', 'VAS_PROXY_ERROR');
  }
};
