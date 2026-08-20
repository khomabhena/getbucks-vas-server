/**
 * Smoke-test empty category / provider filtering against live VAS credentials.
 * Usage: node scripts/test-catalog-visibility.mjs
 */
import 'dotenv/config';
import {
  collectProvidersWithVisibleCatalog,
  omitEmptyCategories,
  omitEmptyProviders,
} from '../src/services/catalogVisibility.service.js';
import { filterProductsByCurrency } from '../src/utils/currency.js';
import { getProducts, getServiceProviders } from '../src/services/vas.service.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = async () => {
  const currency = 'USD';
  const countryCode = 'ZW';
  const service = '9';

  const providersResult = await getServiceProviders({ countryCode, service });
  assert(providersResult.ok, `service-providers failed: ${providersResult.status}`);

  const filteredProviders = await omitEmptyProviders(providersResult.data, {
    countryCode,
    service,
    currency,
  });

  const before = (providersResult.data.ServiceProviders || []).map((p) => p.Id);
  const after = (filteredProviders.ServiceProviders || []).map((p) => p.Id);

  console.log(`Providers before: ${before.length}, after USD filter: ${after.length}`);
  console.log('Dropped:', before.filter((id) => !after.includes(id)).join(', ') || '(none)');
  console.log('Kept AU-related:', after.filter((id) => String(id).includes('AU')).join(', ') || '(none)');

  assert(!after.includes('PN_AU'), 'PN_AU (ZWG-only) should be hidden for USD');
  assert(after.includes('PC_AU'), 'PC_AU should remain (has USD category with leaves)');

  const visible = await collectProvidersWithVisibleCatalog({
    countryCode,
    service,
    currency,
  });
  assert(visible.has('PC_AU'), 'visible set should include PC_AU');
  assert(!visible.has('PN_AU'), 'visible set should exclude PN_AU');

  const pcAuProducts = await getProducts({
    countryCode,
    service,
    serviceProvider: 'PC_AU',
    currency,
  });
  assert(pcAuProducts.ok, 'PC_AU products failed');

  const filtered = filterProductsByCurrency(pcAuProducts.data, currency);
  const withoutEmpty = await omitEmptyCategories(filtered, currency);
  const products = withoutEmpty.Products || [];
  const categories = products.filter((p) => p.IsCategory === true);
  const leaves = products.filter((p) => p.IsCategory !== true);

  console.log(
    `PC_AU products: categories=${categories.length}, leaves=${leaves.length}`,
    categories.map((c) => c.Id).join(', ')
  );

  assert(categories.length === 1, 'PC_AU should keep its non-empty USD category');

  // Empty-category probe: a ZWG-only parent should drop when currency=USD.
  // Use PN_AU products path — NOTFOUND upstream is ok; synthetic empty check via known empty.
  const emptyProbe = await omitEmptyCategories(
    {
      Status: 'FOUND',
      Products: [
        {
          Id: 'PC_FAKE_EMPTY',
          Name: 'Fake empty',
          IsCategory: true,
          Currency: 'USD',
        },
      ],
    },
    currency
  );
  assert(
    (emptyProbe.Products || []).length === 0,
    'Category with no children should be omitted'
  );

  console.log('OK — catalog visibility checks passed');
};

run().catch((error) => {
  console.error('FAILED:', error.message || error);
  process.exit(1);
});
