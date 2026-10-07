import { SPENDL_HIDE_MOCK_PRODUCTS } from '../config/env.js';
import { getSpendlProducts } from './spendl.service.js';
import { extractProducts } from './catalogVisibility.service.js';

/**
 * Sp3ndl only exposes a flat product list, so services and providers are derived from it.
 * Responses mirror the VAS V2 catalog shape the H5 apps already consume.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const SPENDL_COUNTRY = { Code: 'ZA', Name: 'South Africa' };
const MOCK_PROVIDER_ID = 'MOCK';

let productCache = null;

export const isSpendlCountry = (countryCode) =>
  String(countryCode || '').trim().toUpperCase() === SPENDL_COUNTRY.Code;

export const isSpendlProductId = (productId) => /^SP_/i.test(String(productId || ''));

const withCountry = (product) => ({
  ...product,
  ServiceProvider: { ...product.ServiceProvider, Country: SPENDL_COUNTRY },
});

const isVisible = (product) =>
  !(SPENDL_HIDE_MOCK_PRODUCTS && product?.ServiceProvider?.Id === MOCK_PROVIDER_ID);

const found = (body) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  data: { Status: 'FOUND', ResultMessage: 'Request processed successfully.', ...body },
});

const loadProducts = async () => {
  if (productCache && Date.now() < productCache.expiresAt) {
    return { ok: true, products: productCache.products };
  }

  const result = await getSpendlProducts();
  if (!result.ok) return result;

  const products = extractProducts(result.data).filter(isVisible).map(withCountry);
  productCache = { products, expiresAt: Date.now() + CACHE_TTL_MS };
  return { ok: true, products };
};

const sameId = (a, b) => String(a ?? '') === String(b ?? '');

const uniqueBy = (items, key) => {
  const seen = new Map();
  items.forEach((item) => {
    const id = key(item);
    if (id !== undefined && id !== null && !seen.has(String(id))) seen.set(String(id), item);
  });
  return [...seen.values()];
};

export const listSpendlServices = async () => {
  const loaded = await loadProducts();
  if (!loaded.ok) return loaded;

  const services = uniqueBy(
    loaded.products.map((product) => product.Service).filter(Boolean),
    (service) => service.Id
  ).sort((a, b) => Number(a.Id) - Number(b.Id));

  return found({ Services: services });
};

export const listSpendlServiceProviders = async ({ service }) => {
  const loaded = await loadProducts();
  if (!loaded.ok) return loaded;

  const providers = uniqueBy(
    loaded.products
      .filter((product) => sameId(product.Service?.Id, service))
      .map((product) => product.ServiceProvider)
      .filter(Boolean),
    (provider) => provider.Id
  );

  return found({ ServiceProviders: providers });
};

export const listSpendlProducts = async ({ service, serviceProvider } = {}) => {
  const loaded = await loadProducts();
  if (!loaded.ok) return loaded;

  const products = loaded.products.filter(
    (product) =>
      (!service || sameId(product.Service?.Id, service)) &&
      (!serviceProvider || sameId(product.ServiceProvider?.Id, serviceProvider))
  );

  return found({ Products: products, ServiceProducts: products });
};

export const getSpendlProductById = async (productId) => {
  const loaded = await loadProducts();
  if (!loaded.ok) return loaded;

  const product = loaded.products.find((item) => sameId(item.Id, productId));
  if (!product) {
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      data: { Status: 'NOTFOUND', ResultMessage: `Product not found: ${productId}` },
    };
  }

  return found({ Product: product, ServiceProduct: product });
};
