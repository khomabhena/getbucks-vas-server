import { getProducts } from './vas.service.js';
import {
  filterProductsByCurrency,
  resolveVasCurrency,
} from '../utils/currency.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CATEGORY_DEPTH = 3;

/** @type {Map<string, { expiresAt: number, value: unknown }>} */
const cache = new Map();

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
};

export const isCategoryProduct = (product) =>
  product?.IsCategory === true || product?.isCategory === true;

export const extractProducts = (data) =>
  data?.Products || data?.ServiceProducts || data?.products || [];

export const extractProviders = (data) =>
  data?.ServiceProviders || data?.Providers || data?.serviceProviders || [];

const withProducts = (data, products) => ({
  ...data,
  Products: products,
  ServiceProducts: products,
});

/**
 * Upstream query for product children. ZWG is fetched unscoped then filtered locally
 * (same rule as catalog controller).
 */
const buildChildQuery = (parentProductId, currency) => {
  const normalized = resolveVasCurrency(currency);
  if (normalized === 'ZWG') {
    return { parentProduct: parentProductId };
  }
  return { parentProduct: parentProductId, currency: normalized };
};

const buildProviderProductsQuery = ({ countryCode, service, currency }) => {
  const normalized = resolveVasCurrency(currency);
  if (normalized === 'ZWG') {
    return { countryCode, service };
  }
  return { countryCode, service, currency: normalized };
};

/**
 * Fetch products for a category and apply currency filter (keeps nested categories).
 */
export const fetchCategoryChildren = async (categoryId, currency) => {
  const normalized = resolveVasCurrency(currency);
  const cacheKey = `children:${categoryId}:${normalized}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await getProducts(buildChildQuery(categoryId, normalized));
  if (!result.ok) {
    const empty = [];
    setCached(cacheKey, empty);
    return empty;
  }

  const filtered = filterProductsByCurrency(result.data, normalized);
  const products = extractProducts(filtered);
  setCached(cacheKey, products);
  return products;
};

/**
 * True when a category has at least one payable leaf (or nested category with leaves)
 * for the requested currency.
 */
export const categoryHasVisibleProducts = async (
  categoryId,
  currency,
  depth = 0,
  visiting = new Set()
) => {
  const normalized = resolveVasCurrency(currency);
  const cacheKey = `visible:${categoryId}:${normalized}`;
  const cached = getCached(cacheKey);
  if (typeof cached === 'boolean') return cached;

  if (!categoryId || depth > MAX_CATEGORY_DEPTH || visiting.has(categoryId)) {
    return false;
  }

  visiting.add(categoryId);

  try {
    const children = await fetchCategoryChildren(categoryId, normalized);
    if (!children.length) {
      setCached(cacheKey, false);
      return false;
    }

    const leaves = children.filter((p) => !isCategoryProduct(p));
    if (leaves.length > 0) {
      setCached(cacheKey, true);
      return true;
    }

    const nested = children.filter(isCategoryProduct);
    for (const child of nested) {
      const childId = child?.Id || child?.id;
      if (
        childId &&
        (await categoryHasVisibleProducts(childId, normalized, depth + 1, visiting))
      ) {
        setCached(cacheKey, true);
        return true;
      }
    }

    setCached(cacheKey, false);
    return false;
  } finally {
    visiting.delete(categoryId);
  }
};

/**
 * Drop category rows that have no payable products under the currency filter.
 */
export const omitEmptyCategories = async (data, currency) => {
  const products = extractProducts(data);
  if (!products.length) return data;

  const categories = products.filter(isCategoryProduct);
  if (!categories.length) return data;

  const visibility = await Promise.all(
    categories.map(async (category) => {
      const id = category?.Id || category?.id;
      return {
        id,
        visible: id ? await categoryHasVisibleProducts(id, currency) : false,
      };
    })
  );

  const visibleIds = new Set(
    visibility.filter((row) => row.visible).map((row) => row.id)
  );

  const next = products.filter((product) => {
    if (!isCategoryProduct(product)) return true;
    const id = product?.Id || product?.id;
    return visibleIds.has(id);
  });

  return withProducts(data, next);
};

/**
 * Provider ids that have at least one leaf or non-empty category for currency.
 */
export const collectProvidersWithVisibleCatalog = async ({
  countryCode,
  service,
  currency,
}) => {
  const normalized = resolveVasCurrency(currency);
  const cacheKey = `providers:${countryCode}:${service}:${normalized}`;
  const cached = getCached(cacheKey);
  if (cached instanceof Set) return cached;

  const result = await getProducts(
    buildProviderProductsQuery({ countryCode, service, currency: normalized })
  );

  const visible = new Set();
  if (!result.ok) {
    setCached(cacheKey, visible);
    return visible;
  }

  const filtered = filterProductsByCurrency(result.data, normalized);
  const products = extractProducts(filtered);

  for (const product of products) {
    if (isCategoryProduct(product)) continue;
    const providerId = product?.ServiceProvider?.Id || product?.ServiceProviderId;
    if (providerId) visible.add(String(providerId));
  }

  const categories = products.filter(isCategoryProduct);
  await Promise.all(
    categories.map(async (category) => {
      const categoryId = category?.Id || category?.id;
      if (!categoryId) return;
      const hasProducts = await categoryHasVisibleProducts(categoryId, normalized);
      if (!hasProducts) return;
      const providerId = category?.ServiceProvider?.Id || category?.ServiceProviderId;
      if (providerId) visible.add(String(providerId));
    })
  );

  setCached(cacheKey, visible);
  return visible;
};

/**
 * Keep only providers that have payable catalog for the currency.
 */
export const omitEmptyProviders = async (data, { countryCode, service, currency }) => {
  const providers = extractProviders(data);
  if (!providers.length) return data;

  const visibleIds = await collectProvidersWithVisibleCatalog({
    countryCode,
    service,
    currency,
  });

  const next = providers.filter((provider) => {
    const id = provider?.Id || provider?.id;
    return id && visibleIds.has(String(id));
  });

  return {
    ...data,
    ServiceProviders: next,
    Providers: next,
  };
};
