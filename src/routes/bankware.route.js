import express from 'express';
import * as bankwareController from '../controller/bankware.controller.js';

const routerBankware = express.Router();

routerBankware.post('/token', bankwareController.getToken);
routerBankware.all('/*', bankwareController.proxy);

export default routerBankware;
