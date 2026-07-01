import express from 'express';
import * as paymentConfigController from '../controller/payment.config.controller.js';

const routerPaymentConfig = express.Router();

routerPaymentConfig.get('/merchant-account', paymentConfigController.getMerchantAccount);

export default routerPaymentConfig;
