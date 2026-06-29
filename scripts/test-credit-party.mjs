import { buildCreditPartyIdentifiers } from '../src/utils/creditParty.js';

const buddie = {
  CreditPartyIdentifiers: [
    {
      Required: true,
      Name: 'MemberNumber',
      RegexExpression: '^(0|(\\+)?263)?(77|78|864)\\d{7}$',
    },
  ],
  ServiceProvider: { Country: { Code: 'ZW' } },
};

const airtime = {
  CreditPartyIdentifiers: [
    {
      Required: true,
      Name: 'AccountNumber',
      RegexExpression: '^(0|(\\+)?263)?(77|78|71|73|864)\\d{7}$',
    },
  ],
  ServiceProvider: { Country: { Code: 'ZW' } },
};

const body = { Recipient: { msisdn: '+263774876886' } };

console.log('Buddie', buildCreditPartyIdentifiers(buddie, body));
console.log('Airtime', buildCreditPartyIdentifiers(airtime, body));

const legacy = buildCreditPartyIdentifiers(airtime, {
  CreditPartyIdentifiers: [
    { IdentifierFieldName: 'AccountNumber', IdentifierFieldValue: '+263774876886' },
  ],
});
console.log('Legacy rewrite', legacy);

const zesa = {
  CreditPartyIdentifiers: [
    { Required: true, Name: 'AccountNumber', RegexExpression: '' },
    { Required: true, Name: 'NotifyNumber', RegexExpression: null },
  ],
  ServiceProvider: { Country: { Code: 'ZW' } },
};

const zesaBody = {
  CreditPartyIdentifiers: [
    { IdentifierFieldName: 'AccountNumber', IdentifierFieldValue: '37262778014' },
    { IdentifierFieldName: 'NotifyNumber', IdentifierFieldValue: '0779325860' },
  ],
  CustomerDetails: { MobileNumber: '+263777077921' },
};

console.log('ZESA', buildCreditPartyIdentifiers(zesa, zesaBody));
