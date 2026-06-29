/**
 * Build VAS CreditPartyIdentifiers from catalog product metadata + recipient values.
 * Product-specific field names (MemberNumber vs AccountNumber) come from the catalog only.
 */

export class CreditPartyError extends Error {
  constructor(message, fieldName = null) {
    super(message);
    this.name = 'CreditPartyError';
    this.fieldName = fieldName;
  }
}

export const resolveIdentifierFieldName = (meta = {}) =>
  meta.IdentifierFieldName || meta.Name || meta.FieldName || null;

export const unwrapVasProduct = (data) =>
  data?.ServiceProduct || data?.Product || data || null;

export const getProductCreditPartyMeta = (product) => {
  const identifiers = product?.CreditPartyIdentifiers || [];
  return identifiers
    .map((meta) => ({
      ...meta,
      fieldName: resolveIdentifierFieldName(meta),
    }))
    .filter((meta) => meta.fieldName);
};

export const cleanPhoneNumber = (value) => String(value || '').replace(/[^\d+]/g, '');

export const stripCountryCode = (phoneNumber, countryCode) => {
  const cleaned = cleanPhoneNumber(phoneNumber);
  if (!cleaned) return '';

  if (countryCode) {
    const withPlus = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    const digits = withPlus.replace(/^\+/, '');
    if (cleaned.startsWith(withPlus)) return cleaned.substring(withPlus.length);
    if (cleaned.startsWith(digits)) return cleaned.substring(digits.length);
  }

  const detected = cleaned.match(/^\+(\d{1,3})/);
  if (detected) return cleaned.substring(detected[0].length);

  return cleaned.replace(/^\+/, '');
};

const PHONE_IDENTIFIER_FIELDS = new Set(['MemberNumber', 'NotifyNumber']);

const isPhoneLikeIdentifier = (fieldName, regexExpression) => {
  if (PHONE_IDENTIFIER_FIELDS.has(fieldName)) return true;
  if (!regexExpression) return false;
  return /263|\(0|\\d\{7\}/.test(regexExpression);
};

/** National MSISDN format used by live VAS (e.g. 0771234567 for Zimbabwe). */
export const formatIdentifierValue = (
  value,
  { countryCode, countryIso, regexExpression, fieldName }
) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';

  if (!isPhoneLikeIdentifier(fieldName, regexExpression)) {
    return trimmed;
  }

  const cleaned = cleanPhoneNumber(trimmed);
  const local = stripCountryCode(cleaned, countryCode);
  const iso = String(countryIso || '').toUpperCase();

  if (regexExpression && /\\\+/.test(regexExpression) && !/\(0\|/.test(regexExpression)) {
    if (cleaned.startsWith('+')) return cleaned;
    if (local) return `+${local}`;
    return `+${cleaned}`;
  }

  if (iso === 'ZW' && local && !local.startsWith('0')) {
    return `0${local}`;
  }

  return local || cleaned;
};

const addValue = (values, keys, raw) => {
  if (raw == null || raw === '') return;
  const text = String(raw).trim();
  for (const key of keys) {
    if (!values[key]) values[key] = text;
  }
};

/** Collect recipient values from simplified body fields and any existing identifiers. */
export const collectRecipientValues = (body) => {
  const values = { ...(body.RecipientValues || body.recipientValues || {}) };
  const recipient = body.Recipient || body.recipient || {};

  addValue(values, ['msisdn', 'mobileNumber', 'phoneNumber', 'phone', 'memberNumber'], [
    recipient.msisdn,
    recipient.mobileNumber,
    recipient.phoneNumber,
    recipient.phone,
    recipient.memberNumber,
  ].find(Boolean));

  addValue(values, ['accountNumber'], recipient.accountNumber);
  addValue(values, ['notifyNumber'], recipient.notifyNumber);

  for (const item of body.CreditPartyIdentifiers || []) {
    const fieldName = resolveIdentifierFieldName(item);
    if (fieldName && item.IdentifierFieldValue) {
      addValue(values, [fieldName, fieldName.toLowerCase()], item.IdentifierFieldValue);
    }
  }

  addValue(
    values,
    ['msisdn', 'mobileNumber', 'phoneNumber', 'phone', 'memberNumber', 'accountNumber'],
    body.CustomerDetails?.MobileNumber
  );

  return values;
};

export const resolveValueForField = (fieldName, values) => {
  if (!fieldName) return null;

  if (values[fieldName]) return values[fieldName];
  const lower = fieldName.toLowerCase();
  if (values[lower]) return values[lower];

  if (PHONE_IDENTIFIER_FIELDS.has(fieldName)) {
    for (const key of [
      'msisdn',
      'mobileNumber',
      'phoneNumber',
      'phone',
      'memberNumber',
      'notifyNumber',
    ]) {
      if (values[key]) return values[key];
    }
  }

  if (fieldName === 'AccountNumber') {
    if (values.accountNumber) return values.accountNumber;
    for (const key of ['msisdn', 'mobileNumber', 'phoneNumber', 'phone', 'memberNumber']) {
      if (values[key]) return values[key];
    }
  }

  return null;
};

const assertRegex = (formatted, regexExpression, fieldName) => {
  if (!regexExpression || !formatted) return;

  let pattern;
  try {
    pattern = new RegExp(regexExpression);
  } catch {
    return;
  }

  if (!pattern.test(formatted)) {
    throw new CreditPartyError(`Invalid value for credit party identifier: ${fieldName}`, fieldName);
  }
};

export const buildCreditPartyIdentifiers = (product, body) => {
  const metas = getProductCreditPartyMeta(product);

  if (!metas.length) {
    return Array.isArray(body.CreditPartyIdentifiers) ? body.CreditPartyIdentifiers : [];
  }

  const countryIso =
    body.CountryCode ||
    body.countryCode ||
    recipientCountryIso(body) ||
    product?.ServiceProvider?.Country?.Code ||
    'ZW';

  const countryCallingCode =
    body.CountryCallingCode ||
    body.countryCallingCode ||
    (String(countryIso).toUpperCase() === 'ZW' ? '+263' : null);

  const recipientValues = collectRecipientValues(body);
  const built = [];

  for (const meta of metas) {
    const raw = resolveValueForField(meta.fieldName, recipientValues);

    if (meta.Required && (raw == null || raw === '')) {
      throw new CreditPartyError(
        `Credit party identifier(s) missing: ${meta.fieldName} is required for this product.`,
        meta.fieldName
      );
    }

    if (raw == null || raw === '') continue;

    const formatted = formatIdentifierValue(raw, {
      countryCode: countryCallingCode,
      countryIso,
      regexExpression: meta.RegexExpression,
      fieldName: meta.fieldName,
    });

    assertRegex(formatted, meta.RegexExpression, meta.fieldName);

    built.push({
      IdentifierFieldName: meta.fieldName,
      IdentifierFieldValue: formatted,
    });
  }

  return built;
};

const recipientCountryIso = (body) => {
  const recipient = body.Recipient || body.recipient;
  return recipient?.countryCode || recipient?.countryIso || null;
};

/** Remove BFF-only fields before forwarding to upstream VAS. */
export const stripBffPaymentFields = (body) => {
  const cleaned = { ...body };
  delete cleaned.Recipient;
  delete cleaned.recipient;
  delete cleaned.RecipientValues;
  delete cleaned.recipientValues;
  delete cleaned.CountryCode;
  delete cleaned.countryCode;
  delete cleaned.CountryCallingCode;
  delete cleaned.countryCallingCode;
  return cleaned;
};
