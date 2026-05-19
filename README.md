# GetBucks VAS Server

Value Added Services (VAS) Server for GetBucks H5 Applications.

## Project Structure

```
24-getbucks-vas-server/
-- src/
   -- app.js            # Express app composition
   -- index.js          # Server entry point
   -- routes/           # API route modules
-- public/
   -- tester.html       # Simple API tester
-- package.json
-- .gitignore
-- README.md
```

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Server

```bash
npm start
```

### Development Mode (with watch)

```bash
npm run dev
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Base URL for the token API (local or production)
TOKEN_API_BASE_URL=http://localhost:3001

# Token API server configuration
IBANK_CLIENT_ID=your-ibank-client-id
IBANK_CLIENT_SECRET=your-ibank-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app

# Hot Recharge proxy (server-side only)
HOT_RECHARGE_POST_PAYMENT_URL=https://asb.azure-api.net/vas/V2/PostPayment
HOT_RECHARGE_SUBSCRIPTION_KEY=your-apim-subscription-key
HOT_RECHARGE_MERCHANT_ID=your-merchant-id
HOT_RECHARGE_SIGNATURE=your-signature

# BankWare proxy (server-side only)
BANKWARE_API_BASE_URL=http://s-bwopenapi.getbucks.co.zw
BANKWARE_USERNAME=your-bankware-api-username
BANKWARE_PASSWORD=your-bankware-api-password
BANKWARE_SYSTEM_ID=live
BANKWARE_GRANT_TYPE=password
# Optional overrides
# TOKEN_EXPIRES_IN=1h
# TOKEN_EXPIRES_IN_SECONDS=3600

# Optional sample data for iframe tester
# SAMPLE_APP=bill-payments
# SAMPLE_ACCOUNT_NUMBER=00001203
# SAMPLE_CLIENT_NUMBER=023557
# SAMPLE_SESSION_ID=sample-session-guid
```

## Endpoints

- `GET /` - Simple status message
- `GET /health` - Health check with uptime and timestamp
- `GET /tester` - HTML tester UI
- `POST /api/token/request` - Token generation
- `GET /api/validate-token` - Token validation
- `GET /api/tester-config` - Tester defaults
- `POST /api/getbucks/token` - Server-side BankWare token proxy
- `/api/getbucks/*` - Server-side BankWare API proxy
- `POST /api/hot-recharge/post-payment` - Server-side proxy to Hot Recharge PostPayment

### Health Check

Use `GET /health` to confirm the server is running after deployment.

### Error Response Format

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": []
}
```

### Rate Limiting

- General API: 120 requests/minute
- Token requests: 30 requests/minute

## License

ISC
