import express from 'express';
import * as vasPaymentController from '../controller/vas.payment.controller.js';

/** @deprecated — use POST /api/vas/payment */
const routerVasLegacy = express.Router();

routerVasLegacy.post('/post-payment', vasPaymentController.createPayment);

export default routerVasLegacy;
