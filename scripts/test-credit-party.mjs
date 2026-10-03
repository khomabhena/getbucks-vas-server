import assert from 'node:assert/strict';
import {
  assertIdentifierLimits,
  assertPaymentCode,
  buildCreditPartyIdentifiers,
  CreditPartyError,
} from '../src/utils/creditParty.js';

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

const university = {
  CreditPartyIdentifiers: [
    { Required: true, Name: 'AccountNumber', Title: 'Student Number' },
    { Required: true, Name: 'StudentName', Title: 'Student Name' },
    { Required: true, Name: 'Semester', Title: 'Semester' },
    { Required: true, Name: 'Level', Title: 'Level' },
  ],
  PaymentCodeRequired: true,
  PaymentCodes: [
    { Code: '100', Name: 'Tuition Fees' },
    { Code: '105', Name: 'Accommodation' },
  ],
  ServiceProvider: { Country: { Code: 'ZW' } },
};

const universityValidate = {
  CreditPartyIdentifiers: [{ IdentifierFieldName: 'AccountNumber', IdentifierFieldValue: 'C1234567' }],
  PaymentCode: '105',
};

assert.deepEqual(
  buildCreditPartyIdentifiers(university, universityValidate, { stage: 'validate' }),
  [{ IdentifierFieldName: 'AccountNumber', IdentifierFieldValue: 'C1234567' }],
  'validate stage sends only the primary identifier'
);
assert.throws(
  () => buildCreditPartyIdentifiers(university, universityValidate, { stage: 'post' }),
  (error) => error instanceof CreditPartyError && error.fieldName === 'StudentName',
  'post stage requires every required identifier'
);

const universityPost = {
  CreditPartyIdentifiers: [
    { IdentifierFieldName: 'AccountNumber', IdentifierFieldValue: 'C1234567' },
    { IdentifierFieldName: 'StudentName', IdentifierFieldValue: 'George Mbwando' },
    { IdentifierFieldName: 'Semester', IdentifierFieldValue: '1' },
    { IdentifierFieldName: 'Level', IdentifierFieldValue: '2nd Year' },
  ],
  PaymentCode: '105',
};
assert.equal(buildCreditPartyIdentifiers(university, universityPost).length, 4);

assert.doesNotThrow(() => assertPaymentCode(university, universityPost));
assert.throws(
  () => assertPaymentCode(university, { PaymentCode: '' }),
  (error) => error.fieldName === 'PaymentCode',
  'missing PaymentCode is rejected when PaymentCodeRequired'
);
assert.throws(
  () => assertPaymentCode(university, { PaymentCode: '999' }),
  (error) => error.fieldName === 'PaymentCode',
  'PaymentCode outside the catalog list is rejected'
);
assert.doesNotThrow(() => assertPaymentCode(zesa, {}), 'products without payment codes are unaffected');

assert.doesNotThrow(() =>
  assertIdentifierLimits([{ IdentifierFieldName: 'PaymentReason', IdentifierFieldValue: 'Tuition fees.' }])
);
assert.throws(
  () =>
    assertIdentifierLimits([
      { IdentifierFieldName: 'PaymentReason', IdentifierFieldValue: 'Transport fees' },
    ]),
  (error) => error.fieldName === 'PaymentReason',
  'PaymentReason longer than 13 characters is rejected'
);

console.log('Education identifiers / PaymentCode / PaymentReason: OK');
