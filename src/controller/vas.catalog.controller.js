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
  filterProductsByCurrency,
  isSupportedVasCurrency,
  productMatchesCurrency,
  resolveVasCurrency,
} from '../utils/currency.js';
import { sendError } from '../utils/http.js';

const forwardVas = async (res, promise, transform) => {
  const missing = assertVasConfigured();
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

    const payload = transform ? transform(result.data) : result.data;
    if (payload === null) {
      return sendError(res, 404, 'Product not found for currency', 'NOT_FOUND');
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error('VAS catalog failed:', error);
    return sendError(res, 502, error.message || 'VAS request failed', 'VAS_PROXY_ERROR');
  }
};

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
  params.currency = currency;

  return { params, currency };
};

export const connect = async (req, res) => forwardVas(res, getConnect());

export const listServices = async (req, res) => forwardVas(res, getServices(req.query));

export const listCountries = async (req, res) => {
  const service = req.query.service;
  if (!service) {
    return sendError(res, 400, 'Query param "service" is required', 'INVALID_REQUEST');
  }
  return forwardVas(res, getCountries(service));
};

export const listServiceProviders = async (req, res) => {
  const { countryCode, service } = req.query;
  if (!countryCode || !service) {
    return sendError(
      res,
      400,
      'Query params "countryCode" and "service" are required',
      'INVALID_REQUEST'
    );
  }
  return forwardVas(res, getServiceProviders({ countryCode, service }));
};

export const listProducts = async (req, res) => {
  const parsed = parseCatalogQuery(req.query);
  if (parsed.invalidCurrency) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  const { params, currency } = parsed;
  return forwardVas(res, getProducts(params), (data) => filterProductsByCurrency(data, currency));
};

export const getProductById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendError(res, 400, 'Product id is required', 'INVALID_REQUEST');
  }

  const requestedCurrency = req.query.currency;
  if (requestedCurrency && !isSupportedVasCurrency(requestedCurrency)) {
    return sendError(res, 400, 'Unsupported currency. Use USD or ZWG/ZIG/ZWL', 'INVALID_REQUEST');
  }

  const currency = resolveVasCurrency(requestedCurrency);

  return forwardVas(res, getProduct(id), (data) => {
    const product = data.ServiceProduct || data.Product || data;
    return productMatchesCurrency(product, currency) ? data : null;
  });
};
