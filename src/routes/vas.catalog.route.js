import express from 'express';
import * as vasCatalogController from '../controller/vas.catalog.controller.js';

/** Catalog proxy — see postman/CATALOG.md (flat + parentProduct category flows). */
const routerVasCatalog = express.Router();

routerVasCatalog.get('/connect', vasCatalogController.connect);
routerVasCatalog.get('/services', vasCatalogController.listServices);
routerVasCatalog.get('/countries', vasCatalogController.listCountries);
routerVasCatalog.get('/service-providers', vasCatalogController.listServiceProviders);
routerVasCatalog.get('/products', vasCatalogController.listProducts);
routerVasCatalog.get('/products/:id', vasCatalogController.getProductById);

export default routerVasCatalog;
