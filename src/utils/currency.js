const ZWG_ALIASES = new Set(['ZWG', 'ZIG', 'ZWL', 'ZWLZ']);

export const DEFAULT_VAS_CURRENCY = 'USD';

/** Map bank/H5 currency codes to VAS catalog currency (USD | ZWG). */
export const normalizeVasCurrency = (code) => {
  if (!code) return null;
  const upper = String(code).trim().toUpperCase();
  if (upper === 'USD') return 'USD';
  if (ZWG_ALIASES.has(upper)) return 'ZWG';
  return upper;
};

export const isSupportedVasCurrency = (code) => {
  const normalized = normalizeVasCurrency(code);
  return normalized === 'USD' || normalized === 'ZWG';
};

/** Resolve catalog currency; defaults to USD when omitted or unsupported. */
export const resolveVasCurrency = (code) => {
  const normalized = code ? normalizeVasCurrency(code) : null;
  if (normalized === 'USD' || normalized === 'ZWG') return normalized;
  return DEFAULT_VAS_CURRENCY;
};

export const productCurrency = (product) =>
  normalizeVasCurrency(product?.Currency || product?.currency);

export const filterProductsByCurrency = (data, currency) => {
  const normalized = resolveVasCurrency(currency);

  const products = data.Products || data.ServiceProducts || data.products || [];
  const filtered = products.filter((product) => productCurrency(product) === normalized);

  return {
    ...data,
    Products: filtered,
    ServiceProducts: filtered,
  };
};

export const productMatchesCurrency = (product, currency) => {
  const normalized = resolveVasCurrency(currency);
  return productCurrency(product) === normalized;
};
