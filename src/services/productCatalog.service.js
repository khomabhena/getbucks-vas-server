import { getProduct } from './vas.service.js';
import { unwrapVasProduct } from '../utils/creditParty.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const productCache = new Map();

const cacheKey = (productId, currency) => `${productId}:${currency || 'any'}`;

export const fetchProductById = async (productId, currency) => {
  if (!productId) return null;

  const key = cacheKey(productId, currency);
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.product;
  }

  const result = await getProduct(productId);
  if (!result.ok) {
    return null;
  }

  const product = unwrapVasProduct(result.data);
  if (!product) return null;

  productCache.set(key, { at: Date.now(), product });
  return product;
};

export const clearProductCache = () => {
  productCache.clear();
};
