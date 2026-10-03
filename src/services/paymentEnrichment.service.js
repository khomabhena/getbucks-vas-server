import { fetchProductById } from './productCatalog.service.js';
import { normalizePaymentBody } from './paymentNormalization.service.js';
import {
  assertIdentifierLimits,
  assertPaymentCode,
  buildCreditPartyIdentifiers,
  CreditPartyError,
  getProductCreditPartyMeta,
  resolveIdentifierFieldName,
  stripBffPaymentFields,
} from '../utils/creditParty.js';

function hasCompleteCreditPartyIdentifiers(product, body) {
  const metas = getProductCreditPartyMeta(product);
  if (!metas.length) return false;

  const existing = Array.isArray(body.CreditPartyIdentifiers) ? body.CreditPartyIdentifiers : [];
  if (!existing.length) return false;

  const requiredMetas = metas.filter((meta) => meta.Required);
  const targets = requiredMetas.length ? requiredMetas : metas;

  return targets.every((meta) =>
    existing.some((item) => {
      const fieldName = resolveIdentifierFieldName(item);
      const value = item.IdentifierFieldValue;
      return fieldName === meta.fieldName && value != null && String(value).trim() !== '';
    })
  );
}

/**
 * Enrich a VAS payment body using catalog CreditPartyIdentifiers for the ProductId.
 * H5 apps may send Recipient { msisdn, accountNumber, ... } or legacy CreditPartyIdentifiers.
 *
 * @param {'validate'|'post'} [options.stage] - ValidatePayment vs PostPayment
 */
export const enrichPaymentBody = async (body, { stage = 'post' } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CreditPartyError('Invalid payment payload');
  }

  if (!body.ProductId) {
    return normalizePaymentBody(stripBffPaymentFields(body));
  }

  const product = await fetchProductById(body.ProductId, body.Currency);
  if (!product) {
    if (Array.isArray(body.CreditPartyIdentifiers) && body.CreditPartyIdentifiers.length > 0) {
      return normalizePaymentBody(stripBffPaymentFields(body));
    }
    throw new CreditPartyError(`Product not found: ${body.ProductId}`);
  }

  assertPaymentCode(product, body);

  const creditPartyIdentifiers = hasCompleteCreditPartyIdentifiers(product, body)
    ? body.CreditPartyIdentifiers
    : buildCreditPartyIdentifiers(product, body, { stage });

  assertIdentifierLimits(creditPartyIdentifiers);

  return normalizePaymentBody(
    stripBffPaymentFields({
      ...body,
      CreditPartyIdentifiers: creditPartyIdentifiers,
    }),
    product
  );
};
