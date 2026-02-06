# GetBucks VAS Server

Value Added Services (VAS) Server for GetBucks H5 Applications.

## Project Structure

```
24-getbucks-vas-server/
-- src/
   -- index.js          # Entry point
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
TOKEN_API_BASE_URL=http://localhost:3000

# Token API server configuration
IBANK_CLIENT_ID=your-ibank-client-id
IBANK_CLIENT_SECRET=your-ibank-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
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
