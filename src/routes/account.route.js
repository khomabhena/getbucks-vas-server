import express from 'express';
import * as accountController from '../controller/account.controller.js';

const routerAccount = express.Router();

routerAccount.get('/:accountNumber/currency', accountController.getAccountCurrency);

export default routerAccount;
