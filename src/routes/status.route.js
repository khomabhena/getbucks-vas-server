import express from 'express';
import * as statusController from '../controller/status.controller.js';

const routerStatus = express.Router();

routerStatus.get('/', statusController.root);
routerStatus.get('/health', statusController.health);
routerStatus.get('/tester', statusController.testerPage);
routerStatus.get('/iframe-tester', statusController.iframeTesterPage);

export default routerStatus;
