/**
 * Route map
 *
 * Status
 *   GET  /  /health  /tester  /iframe-tester
 *
 * H5 / iBank / MB (unchanged paths)
 *   POST /api/token/request
 *   GET  /api/validate-token
 *   GET  /api/tester-config
 *   GET  /api/iframe-config
 *   GET  /api/sample-iframe-data
 *
 * VAS catalog → VAS /V2/*
 *   GET  /api/vas/catalog/connect
 *   GET  /api/vas/catalog/services
 *   GET  /api/vas/catalog/countries?service=
 *   GET  /api/vas/catalog/service-providers?countryCode=&service=
 *   GET  /api/vas/catalog/products?currency=USD|ZWG|ZIG|ZWL
 *   GET  /api/vas/catalog/products/:id?currency=
 *
 * Payment callback
 *   ALL  /api/payment/callback
 *
 * VAS payment
 *   POST /api/vas/payment/validate → VAS /V2/ValidatePayment
 *   POST /api/vas/payment          → VAS /V2/PostPayment
 *
 * VAS legacy (deprecated)
 *   POST /api/hot-recharge/post-payment
 *
 * Account
 *   GET  /api/accounts/:accountNumber/currency
 *
 * BankWare
 *   POST /api/getbucks/token
 *   ALL  /api/getbucks/*
 */

import { sendError } from '../utils/http.js';
import routerStatus from './status.route.js';
import routerH5Token from './h5.token.route.js';
import routerVasCatalog from './vas.catalog.route.js';
import routerVasPayment from './vas.payment.route.js';
import routerPaymentCallback from './payment.callback.route.js';
import routerVasLegacy from './vas.legacy.route.js';
import routerAccount from './account.route.js';
import routerBankware from './bankware.route.js';

export function registerRoutes(app) {
  app.use('/', routerStatus);
  app.use('/api', routerH5Token);
  app.use('/api/vas/catalog', routerVasCatalog);
  app.use('/api/vas/payment', routerVasPayment);
  app.use('/api/payment/callback', routerPaymentCallback);
  app.use('/api/hot-recharge', routerVasLegacy);
  app.use('/api/accounts', routerAccount);
  app.use('/api/getbucks', routerBankware);
  app.use('/api', (req, res) => sendError(res, 404, 'Not found', 'NOT_FOUND'));
}
