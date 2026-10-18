import express from 'express';
import * as vasPaymentController from '../controller/vas.payment.controller.js';

const routerVasPayment = express.Router();

routerVasPayment.post('/validate', vasPaymentController.validateBeforePayment);
routerVasPayment.get('/receipt', vasPaymentController.downloadOfficialReceipt);
routerVasPayment.post('/', vasPaymentController.createPayment);

export default routerVasPayment;
