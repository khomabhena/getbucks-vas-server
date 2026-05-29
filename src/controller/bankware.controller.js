import {
  getBankWareTokenCredentials,
  proxyBankWareRequest,
  requestBankWareToken,
} from '../services/bankware.service.js';
import { proxyBankWareResponse, sendError } from '../utils/http.js';

export const getToken = async (req, res) => {
  const credentials = getBankWareTokenCredentials();
  if (!credentials.username || !credentials.password || !credentials.systemId) {
    return sendError(res, 500, 'BankWare credentials missing', 'SERVER_CONFIG');
  }

  try {
    const response = await requestBankWareToken();
    return proxyBankWareResponse(res, response);
  } catch (error) {
    console.error('BankWare token failed:', error);
    return sendError(res, 502, error.message || 'BankWare token failed', 'BANKWARE_PROXY_ERROR');
  }
};

export const proxy = async (req, res) => {
  try {
    const response = await proxyBankWareRequest(req);
    return proxyBankWareResponse(res, response);
  } catch (error) {
    console.error('BankWare proxy failed:', error);
    return sendError(res, 502, error.message || 'BankWare request failed', 'BANKWARE_PROXY_ERROR');
  }
};
