import {
  assertVasConfigured,
  getConnect,
  getCountries,
  getProduct,
  getProducts,
  getServiceProviders,
  getServices,
} from '../services/vas.service.js';
import {
  omitEmptyCategories,
  omitEmptyProviders,
  omitEmptyServices,
} from '../services/catalogVisibility.service.js';
import {
  filterProductsByCurrency,
  isSupportedVasCurrency,
  productMatchesCurrency,
  resolveVasCurrency,
} from '../utils/currency.js';
import { assertSpendlConfigured } from '../services/spendl.service.js';
import {
  getSpendlProductById,
  isSpendlCountry,
  isSpendlProductId,
  listSpendlProducts,
  listSpendlServiceProviders,
  listSpendlServices,
} from '../services/spendlCatalog.service.js';
import { sendError } from '../utils/http.js';

const forwardVas = async (res, promise, transform, assertConfigured = assertVasConfigured) => {
  const missing = assertConfigured();
  if (missing.length) {
    return sendError(res, 500, `Missing: ${missing.join(', ')}`, 'SERVER_CONFIG');
  }

  try {
    const result = await promise;
    if (!result.ok) {
      return res.status(result.status).json({
        error: result.data.ResultMessage || result.data.Message || result.statusText,
        code: 'VAS_REQUEST_FAILED',
        details: result.data,
      });
    }

    const payload = transform ? await transform(result.data) : result.data;
    if (payload === null) {
      return sendError(res, 404, 'Product not found for currency', 'NOT_FOUND');
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('VAS catalog failed:', error);
    return sendError(res, 502, error.message || 'VAS request failed', 'VAS_PROXY_ERROR');
  }
};

/** South Africa catalog (Sp3ndl, ZAR only — the currency query is ignored). */
const forwardSpendl = (res, promise) =>
  forwardVas(res, promise, undefined, assertSpendlConfigured);

const parseCatalogQuery = (query) => {
  const params = { ...query };

  if (params.serviceProviderId && !params.serviceProvider) {
    params.serviceProvider = params.serviceProviderId;
    delete params.serviceProviderId;
  }

  const requestedCurrency = params.currency;
  if (requestedCurrency && !isSupportedVasCurrency(requestedCurrency)) {
    return { invalidCurrency: true };
  }

  const currency = resolveVasCurrency(requestedCurrency);
  // VAS tags local products as ZWG, ZWL, or ZIG — upstream currency=ZWG omits ZWL rows (e.g. DSTV).
  // Fetch unscoped for local currency and rely on post-filter alias matching.
  if (currency === 'ZWG') {
    delete params.currency;
  } else {
    params.currency = currency;
  }

  return { params, currency };
};

export const connect = async (req, res) => forwardVas(res, getConnect());

export const listServices = async (req, res) => {
  const { countryCode, currency: requestedCurrency } = req.query;

  if (isSpendlCountry(countryCode)) {
    return forwardSpendl(res, listSpendlServices());
  }

  if (requestedCurrency && !isSupportedVasCurrency(requestedCurrency)) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  // Default USD. Without countryCode we cannot probe products — return upstream list as-is.
  const currency = resolveVasCurrency(requestedCurrency);

  return forwardVas(res, getServices(req.query), async (data) => {
    if (!countryCode) return data;
    return omitEmptyServices(data, { countryCode, currency });
  });
};

export const listCountries = async (req, res) => {
  const service = req.query.service;
  if (!service) {
    return sendError(res, 400, 'Query param "service" is required', 'INVALID_REQUEST');
  }
  return forwardVas(res, getCountries(service));
};

export const listServiceProviders = async (req, res) => {
  const { countryCode, service, currency: requestedCurrency } = req.query;
  if (!countryCode || !service) {
    return sendError(
      res,
      400,
      'Query params "countryCode" and "service" are required',
      'INVALID_REQUEST'
    );
  }

  if (isSpendlCountry(countryCode)) {
    return forwardSpendl(res, listSpendlServiceProviders({ service }));
  }

  if (requestedCurrency && !isSupportedVasCurrency(requestedCurrency)) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  // Default USD so empty ZWG-only providers (e.g. PN_AU) are hidden for bill-payments H5.
  const currency = resolveVasCurrency(requestedCurrency);

  return forwardVas(res, getServiceProviders({ countryCode, service }), (data) =>
    omitEmptyProviders(data, { countryCode, service, currency })
  );
};

export const listProducts = async (req, res) => {
  if (isSpendlCountry(req.query.countryCode) || isSpendlProductId(req.query.parentProduct)) {
    return forwardSpendl(
      res,
      listSpendlProducts({
        service: req.query.service,
        serviceProvider: req.query.serviceProvider || req.query.serviceProviderId,
      })
    );
  }

  const parsed = parseCatalogQuery(req.query);
  if (parsed.invalidCurrency) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  const { params, currency } = parsed;
  return forwardVas(res, getProducts(params), async (data) => {
    const filtered = filterProductsByCurrency(data, currency);
    return omitEmptyCategories(filtered, currency);
  });
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendError(res, 400, 'Product id is required', 'INVALID_REQUEST');
  }

  if (isSpendlProductId(id)) {
    return forwardSpendl(res, getSpendlProductById(id));
  }

  const requestedCurrency = req.query.currency;
  if (requestedCurrency && !isSupportedVasCurrency(requestedCurrency)) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  const currency = resolveVasCurrency(requestedCurrency);

  return forwardVas(res, getProduct(id), (data) => {
    const product = data.ServiceProduct || data.Product || data;
    if (product?.IsCategory === true) return data;
    return productMatchesCurrency(product, currency) ? data : null;
  });
};
