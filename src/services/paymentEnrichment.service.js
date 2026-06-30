import { fetchProductById } from './productCatalog.service.js';
import { normalizePaymentBody } from './paymentNormalization.service.js';
import {
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
 */
export const enrichPaymentBody = async (body) => {
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

  if (hasCompleteCreditPartyIdentifiers(product, body)) {
    return normalizePaymentBody(stripBffPaymentFields(body), product);
  }

  const creditPartyIdentifiers = buildCreditPartyIdentifiers(product, body);

  return normalizePaymentBody(
    stripBffPaymentFields({
      ...body,
      CreditPartyIdentifiers: creditPartyIdentifiers,
    }),
    product
  );
};
