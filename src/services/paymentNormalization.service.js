import { getVasPosDefaults } from '../config/env.js';

const DIGITAL_CHANNELS = new Set(['SuperApp', 'API', 'MOBILE', 'H5', 'APP']);

/**
 * Normalize H5 payment bodies to the POS shape that succeeds on VAS Live
 * (matches working Postman: CASH channel, Quantity 0 for most products, registered POS).
 */
export const normalizePaymentBody = (body, product = null) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return body;
  }

  const normalized = { ...body };
  const posDefaults = getVasPosDefaults();

  const incomingChannel = String(body.PaymentChannel || '').trim();
  if (!incomingChannel || DIGITAL_CHANNELS.has(incomingChannel)) {
    normalized.PaymentChannel = posDefaults.paymentChannel;
  }

  const specifyQuantity = product?.SpecifyQuantity === true;
  if (!specifyQuantity) {
    normalized.Quantity = 0;
  } else {
    const quantity = Number(body.Quantity);
    normalized.Quantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
  }

  const incomingPos = body.POSDetails && typeof body.POSDetails === 'object' ? body.POSDetails : {};
  const placeholderPos =
    !incomingPos.StoreId ||
    !incomingPos.TerminalId ||
    !incomingPos.CashierId ||
    incomingPos.StoreId === 'SuperApp' ||
    incomingPos.TerminalId === 'SuperApp' ||
    incomingPos.CashierId === 'SuperApp';

  if (placeholderPos) {
    normalized.POSDetails = {
      StoreId: posDefaults.storeId,
      TerminalId: posDefaults.terminalId,
      CashierId: posDefaults.cashierId,
    };
  }

  const customer = { ...(body.CustomerDetails || {}) };
  if (!customer.CustomerId || customer.CustomerId === '1') {
    customer.CustomerId = posDefaults.customerId;
  }
  if (customer.EmailAddress === 'string') {
    customer.EmailAddress = null;
  }
  normalized.CustomerDetails = customer;

  if (!normalized.PaymentReferenceNumber && normalized.RequestId) {
    normalized.PaymentReferenceNumber = normalized.RequestId;
  }

  return normalized;
};
