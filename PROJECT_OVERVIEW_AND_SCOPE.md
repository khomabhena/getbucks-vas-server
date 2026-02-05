# Project Overview & Scope: GetBucks Bill Payments & Airtime Integration with iBank

## Project Overview

This project implements a secure token-based integration between GetBucks H5 applications (Airtime Top-Up and Bill Payments) and iBank's mobile app and Internet Banking platform. The integration includes security measures to prevent account manipulation and ensure secure payment processing.

## Key Requirements from iBank

### 1. Security Concern
**Problem**: iBank is concerned that a malicious user could:
- Obtain the iframe URL
- Modify the `accountNumber` parameter in the URL
- Debit a different account than intended

**Solution**: Implement sessionID validation to ensure the debit account matches the authenticated session.

### 2. SessionID Flow
- iBank generates a sessionID (GUID) when user logs in
- sessionID is passed when requesting token
- sessionID is included in the account transfer payload
- iBank validates that the debit account matches the sessionID

## Complete Project Scope

### Phase 1: Token Endpoint Implementation

#### 1.1 Token Generation Endpoint
**Endpoint**: `POST /api/token/request`

**Request**:
```json
{
  "clientId": "ibank-client-id",
  "clientSecret": "ibank-client-secret",
  "app": "bill-payments",  // or "airtime"
  "sessionID": "[GUID]"    // NEW: iBank-generated session identifier
}
```

**Response**:
```json
{
  "success": true,
  "token": "jwt-token-here",
  "expiresIn": 3600,
  "baseUrl": "https://h5-getbucks-bill-payments.vercel.app",
  "app": "bill-payments"
}
```

**Implementation Tasks**:
- [ ] Create Vercel serverless function `/api/token/request.js`
- [ ] Validate `clientId` and `clientSecret`
- [ ] Validate `app` parameter (must be "airtime" or "bill-payments")
- [ ] Accept and store `sessionID` in token payload
- [ ] Generate JWT token with sessionID included
- [ ] Return appropriate `baseUrl` based on `app` parameter
- [ ] Add rate limiting
- [ ] Add error handling

#### 1.2 Token Validation
**Endpoint**: `GET /api/validate-token` (or middleware)

**Tasks**:
- [ ] Validate JWT token on app load
- [ ] Check token expiration
- [ ] Extract sessionID from token
- [ ] Return 401 if invalid/expired

### Phase 2: App Integration

#### 2.1 App-Level Token Validation
**File**: `src/App.jsx`

**Tasks**:
- [ ] Validate token on app load (iframe mode only)
- [ ] Extract sessionID from token
- [ ] Store sessionID for use in payment processing
- [ ] Show error if token invalid/expired
- [ ] Allow access if not in iframe mode

#### 2.2 SessionID Storage & Retrieval
**Tasks**:
- [ ] Store sessionID from token in app state/context
- [ ] Make sessionID available to payment processing components
- [ ] Ensure sessionID persists through navigation

### Phase 3: Account Transfer API Integration

#### 3.1 Update Account Transfer Payload
**File**: `src/services/bankPaymentService.js` (or payment service)

**Current Payload Structure** (from BankWare API):
```json
{
  "externalReference": "string",
  "clientNumber": "string",
  "debitAccount": "string",
  "debitCurrency": "string",
  "debitAmount": 0,
  "debitNarrative1": "string",
  "creditAccount": "string",
  "creditCurrency": "string",
  "creditAmount": 0,
  "valueDate": "2026-01-28T17:08:13.086Z",
  "exchangeRate": 0,
  "chargesBourneBy": 0,
  "blockReference": "string",
  "charges": [
    {
      "chargeNumber": 0,
      "chargeAmount": 0
    }
  ],
  "sessionID": "[GUID]"  // NEW: Must be included
}
```

**Tasks**:
- [ ] Update `processGetBucksPayment` function
- [ ] Include `sessionID` in account transfer payload
- [ ] Ensure sessionID is passed from token/app state to payment service
- [ ] Update payment service to accept sessionID parameter
- [ ] Test account transfer API call with sessionID

#### 3.2 Payment Flow Integration
**Files**: `src/pages/Payment.jsx`, `src/services/paymentBridge.js`

**Tasks**:
- [ ] Retrieve sessionID from app state/context
- [ ] Pass sessionID to payment service
- [ ] Include sessionID in BankWare API call
- [ ] Handle payment response
- [ ] Error handling for invalid sessionID

### Phase 4: URL Parameter Handling

#### 4.1 Update URL Parameter Parsing
**File**: `src/utils/modeDetection.js` or `src/App.jsx`

**Tasks**:
- [ ] Ensure `accountNumber` is read from URL (provided by iBank)
- [ ] Ensure `clientNumber` is read from URL (provided by iBank)
- [ ] Note: sessionID comes from token, NOT from URL

### Phase 5: Documentation & Testing

#### 5.1 API Documentation
**Tasks**:
- [ ] Document token endpoint with sessionID parameter
- [ ] Document account transfer payload with sessionID
- [ ] Update integration guide
- [ ] Provide example requests/responses

#### 5.2 Testing
**Tasks**:
- [ ] Test token generation with sessionID
- [ ] Test token validation
- [ ] Test payment flow with sessionID
- [ ] Test account transfer API call
- [ ] Test error scenarios (invalid sessionID, expired token, etc.)
- [ ] Integration testing with iBank

## Technical Architecture

### Flow Diagram

```
┌─────────────────┐
│  iBank System   │
│  (User Logged)  │
└────────┬────────┘
         │
         │ 1. Generate sessionID (GUID)
         │    User selects account
         │
         ▼
┌─────────────────┐
│  iBank Requests │
│     Token       │
└────────┬────────┘
         │
         │ 2. POST /api/token/request
         │    {
         │      clientId, clientSecret,
         │      app: "bill-payments",
         │      sessionID: "[GUID]"
         │    }
         │
         ▼
┌─────────────────┐
│  Token Endpoint │
│   (Our Server)  │
└────────┬────────┘
         │
         │ 3. Validate credentials
         │    Store sessionID in token
         │    Return token + baseUrl
         │
         ▼
┌─────────────────┐
│  iBank Embeds   │
│     Iframe      │
└────────┬────────┘
         │
         │ 4. Embed iframe with:
         │    - token (from endpoint)
         │    - accountNumber (from iBank)
         │    - clientNumber (from iBank)
         │
         ▼
┌─────────────────┐
│  H5 App Loads   │
│  (Validates)    │
└────────┬────────┘
         │
         │ 5. Extract sessionID from token
         │    Store in app state
         │
         ▼
┌─────────────────┐
│  User Completes │
│     Payment     │
└────────┬────────┘
         │
         │ 6. POST /api/v2/account-transfers
         │    {
         │      debitAccount: accountNumber,
         │      ...other fields...,
         │      sessionID: "[GUID]"  // From token
         │    }
         │
         ▼
┌─────────────────┐
│  iBank Validates│
│   sessionID vs  │
│  debitAccount   │
└────────┬────────┘
         │
         │ 7. If match: Process payment
         │    If mismatch: Reject
         │
         ▼
    ✅ Payment Complete
```

## Security Implementation

### SessionID Validation Flow

1. **Token Request**: iBank includes sessionID when requesting token
2. **Token Storage**: sessionID is embedded in JWT token payload
3. **App Extraction**: App extracts sessionID from token on load
4. **Payment Request**: App includes sessionID in account transfer payload
5. **iBank Validation**: iBank validates that:
   - sessionID is valid and active
   - debitAccount matches the account associated with sessionID
   - If mismatch → reject payment

### Security Benefits

- ✅ Prevents account number manipulation in URL
- ✅ Ensures debit account matches authenticated session
- ✅ sessionID is in token (not visible in URL after initial load)
- ✅ iBank has full control over session validation

## Implementation Details

### Token Payload Structure

```javascript
{
  clientId: "ibank-client-id",
  app: "bill-payments",
  sessionID: "[GUID]",  // From iBank
  userId: "optional",
  issuedAt: 1234567890,
  exp: 1234571490  // 1 hour later
}
```

### Account Transfer Payload Structure

```javascript
{
  externalReference: "string",
  clientNumber: "string",
  debitAccount: "string",  // From URL parameter
  debitCurrency: "string",
  debitAmount: 0,
  creditAccount: "string",
  creditCurrency: "string",
  creditAmount: 0,
  // ... other fields ...
  sessionID: "[GUID]"  // From token, included in payload
}
```

## Files to Modify/Create

### New Files
- [ ] `api/token/request.js` - Token generation endpoint
- [ ] `api/validate-token.js` - Token validation endpoint (optional)

### Modified Files
- [ ] `src/App.jsx` - Token validation on load, sessionID extraction
- [ ] `src/services/bankPaymentService.js` - Include sessionID in account transfer payload
- [ ] `src/services/paymentBridge.js` - Pass sessionID to payment service
- [ ] `src/pages/Payment.jsx` - Retrieve and use sessionID
- [ ] `package.json` - Add `jsonwebtoken` dependency

### Documentation
- [ ] `EMAIL_RESPONSE_DRAFT.md` - Update with sessionID requirement
- [ ] `TOKEN_ENDPOINT_IMPLEMENTATION.md` - Update with sessionID
- [ ] API documentation for iBank

## Dependencies

### New Dependencies
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0"
  }
}
```

### Environment Variables
```
IBANK_CLIENT_ID=your-ibank-client-id
IBANK_CLIENT_SECRET=your-ibank-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
```

## Testing Requirements

### Unit Tests
- [ ] Token generation with sessionID
- [ ] Token validation
- [ ] sessionID extraction from token
- [ ] Account transfer payload construction

### Integration Tests
- [ ] Full flow: Token request → Iframe load → Payment → Account transfer
- [ ] sessionID validation by iBank
- [ ] Error handling (invalid sessionID, expired token, etc.)

### Security Tests
- [ ] Token cannot be forged
- [ ] sessionID cannot be modified
- [ ] Account number manipulation prevention
- [ ] Token expiration handling

## Timeline Estimate

- **Phase 1 (Token Endpoint)**: 2-3 days
- **Phase 2 (App Integration)**: 1-2 days
- **Phase 3 (Account Transfer)**: 1-2 days
- **Phase 4 (URL Parameters)**: 0.5 days
- **Phase 5 (Documentation & Testing)**: 1-2 days
- **Total**: 5-9 days

## Questions to Resolve

1. **sessionID Format**: Confirm GUID format requirements
2. **sessionID Lifetime**: How long is sessionID valid? (should match token lifetime?)
3. **Error Handling**: What should happen if sessionID validation fails?
4. **BankWare API**: Confirm that BankWare API accepts `sessionID` field in payload
5. **OAuth Credentials**: Still need clarification on how BankWare OAuth credentials will be provided

## Success Criteria

- ✅ Token endpoint accepts and stores sessionID
- ✅ App extracts sessionID from token
- ✅ Account transfer payload includes sessionID
- ✅ iBank can validate sessionID against debit account
- ✅ Security: Account number manipulation prevented
- ✅ Both apps (Airtime and Bill Payments) work with sessionID
- ✅ Full integration tested and working

