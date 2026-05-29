import express from 'express';
import {
  requestToken,
  validateToken,
  getTokenConfig,
  getIframeConfig,
  getSampleIframeData,
} from '../controller/h5.token.controller.js';

/** iBank / MB integration paths (unchanged) */
const routerH5Token = express.Router();

routerH5Token.post('/token/request', requestToken);
routerH5Token.get('/validate-token', validateToken);
routerH5Token.get('/tester-config', getTokenConfig);
routerH5Token.get('/iframe-config', getIframeConfig);
routerH5Token.get('/sample-iframe-data', getSampleIframeData);

export default routerH5Token;
