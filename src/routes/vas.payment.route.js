import express from 'express';
import * as vasPaymentController from '../controller/vas.payment.controller.js';

const routerVasPayment = express.Router();

routerVasPayment.post('/validate', vasPaymentController.validateBeforePayment);
routerVasPayment.post('/', vasPaymentController.createPayment);

export default routerVasPayment;
