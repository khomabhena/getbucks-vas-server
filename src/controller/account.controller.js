import { getAccountByNumber } from '../services/bankware.service.js';
import { resolveVasCurrency } from '../utils/currency.js';
import { sendError } from '../utils/http.js';

export const getAccountCurrency = async (req, res) => {
  const accountNumber = req.params.accountNumber?.trim();
  if (!accountNumber) {
    return sendError(res, 400, 'Account number is required', 'INVALID_REQUEST');
  }

  try {
    const result = await getAccountByNumber(accountNumber);

    if (!result.ok) {
      const message =
        result.data?.message || result.data?.error || result.statusText || 'Account lookup failed';
      return sendError(res, result.status, message, 'BANKWARE_ACCOUNT_FAILED', result.data);
    }

    const account = result.data;
    const currencyCode = account.currencyCode || account.CurrencyCode;

    if (!currencyCode) {
      return sendError(res, 502, 'Account response missing currencyCode', 'BANKWARE_ACCOUNT_FAILED', account);
    }

    const vasCurrency = resolveVasCurrency(currencyCode);

    return res.status(200).json({
      accountNumber: account.accountNumber || accountNumber,
      currencyCode,
      vasCurrency,
      accountDescription: account.accountDescription || account.AccountDescription || null,
      clientNumber: account.clientNumber || account.ClientNumber || null,
      availableBalance: account.availableBalance ?? account.AvailableBalance ?? null,
      currentBalance: account.currentBalance ?? account.CurrentBalance ?? null,
    });
  } catch (error) {
    console.error('Account currency lookup failed:', error);
    return sendError(res, 502, error.message || 'Account lookup failed', 'BANKWARE_PROXY_ERROR');
  }
};
