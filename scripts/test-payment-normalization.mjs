import { enrichPaymentBody } from '../src/services/paymentEnrichment.service.js';

const h5 = {
  RequestId: 'test-h5',
  PaymentChannel: 'SuperApp',
  PaymentReferenceNumber: 'test-h5',
  ProductId: 'HR_100_100',
  Quantity: '1',
  Currency: 'USD',
  Amount: 1,
  CountryCode: 'ZW',
  Recipient: { msisdn: '+263774876886' },
  CustomerDetails: {
    CustomerId: '1',
    Fullname: 'Customer',
    MobileNumber: '0774876886',
    EmailAddress: 'string',
  },
  POSDetails: { StoreId: 'SuperApp', TerminalId: 'SuperApp', CashierId: 'SuperApp' },
};

const bundle = {
  ...h5,
  ProductId: 'PN_ECONET_5-BOJU1',
  Amount: 1,
};

console.log('AIRTIME', JSON.stringify(await enrichPaymentBody(h5), null, 2));
console.log('BUNDLE', JSON.stringify(await enrichPaymentBody(bundle), null, 2));
