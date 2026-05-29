import {
  assertVasConfigured,
  getConnect,
  getCountries,
  getProduct,
  getProducts,
  getServiceProviders,
  getServices,
} from '../services/vas.service.js';
import { sendError } from '../utils/http.js';

const forwardVas = async (res, promise) => {
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
    return res.status(200).json(result.data);
  } catch (error) {
    console.error('VAS catalog failed:', error);
    return sendError(res, 502, error.message || 'VAS request failed', 'VAS_PROXY_ERROR');
  }
};

export const connect = async (req, res) => forwardVas(res, getConnect());

export const listServices = async (req, res) => forwardVas(res, getServices());

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

export const listProducts = async (req, res) => forwardVas(res, getProducts(req.query));

export const getProductById = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendError(res, 400, 'Product id is required', 'INVALID_REQUEST');
  }
  return forwardVas(res, getProduct(id));
};
