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
