import express from 'express';
import * as paymentCallbackController from '../controller/payment.callback.controller.js';

const routerPaymentCallback = express.Router();

routerPaymentCallback.all('/', paymentCallbackController.paymentCallback);

export default routerPaymentCallback;
