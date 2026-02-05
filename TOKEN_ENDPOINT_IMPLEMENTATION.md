# Token Endpoint Implementation Guide

## Overview

This document outlines the implementation of a token-based security system for the Bill Payments iframe integration.

**Hosting**: Azure Functions (Node.js)

## Architecture

```
iBank Mobile App
    ↓ (1) Request Token
Azure Functions API (Token Endpoint)
    ↓ (2) Return Token + URL
iBank Mobile App
    ↓ (3) Embed iframe with token
Bill Payments App (Vercel)
    ↓ (4) Validate Token
    ↓ (5) Serve App or Return 401
```

## Implementation

### 1. Token Endpoint (Azure Function)

Create an Azure Function for token generation:

```javascript
// src/functions/tokenRequest.js
const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
  context.log('Token request received');

  // Only allow POST
  if (req.method !== 'POST') {
    context.res = {
      status: 405,
      body: { error: 'Method not allowed' }
    };
    return;
  }

  try {
    const { clientId, clientSecret, app, sessionID, userId } = req.body;

    // Validate client credentials
    if (clientId !== process.env.IBANK_CLIENT_ID || 
        clientSecret !== process.env.IBANK_CLIENT_SECRET) {
      context.res = {
        status: 401,
        body: { error: 'Invalid client credentials' }
      };
      return;
    }

    // Validate app parameter
    const validApps = {
      'airtime': process.env.AIRTIME_APP_URL || 'https://h5-getbucks-airtime.vercel.app',
      'bill-payments': process.env.BILL_PAYMENTS_APP_URL || 'https://h5-getbucks-bill-payments.vercel.app'
    };

    if (!app || !validApps[app]) {
      context.res = {
        status: 400,
        body: { 
          error: 'Invalid app parameter',
          validApps: Object.keys(validApps)
        }
      };
      return;
    }

    // Validate sessionID (required)
    if (!sessionID) {
      context.res = {
        status: 400,
        body: { error: 'sessionID is required' }
      };
      return;
    }

    // Get base URL for the requested app
    const baseUrl = validApps[app];

    // Generate JWT token
    const tokenPayload = {
      clientId,
      app,
      sessionID,
      userId: userId || null,
      issuedAt: Math.floor(Date.now() / 1000),
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        success: true,
        token,
        expiresIn: 3600,
        baseUrl,
        app,
      }
    };
  } catch (error) {
    context.log.error('Token generation error:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};
```

### 2. Token Validation Function (Azure Function)

```javascript
// src/functions/validateToken.js
const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
  const token = req.query.token || 
                req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    context.res = {
      status: 401,
      body: { error: 'Token required' }
    };
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    context.res = {
      status: 200,
      body: {
        valid: true,
        payload: decoded,
      }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      context.res = {
        status: 401,
        body: { error: 'Token expired' }
      };
    } else {
      context.res = {
        status: 401,
        body: { error: 'Invalid token' }
      };
    }
  }
};
```

### 3. App-Level Token Validation

Update `src/App.jsx` to validate token on load:

```javascript
// src/App.jsx
import { useEffect, useState } from 'react';
import { getUrlParams } from './utils/modeDetection';

function App() {
  const [tokenValid, setTokenValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      const params = getUrlParams();
      const mode = getMode();
      
      // Only validate in iframe mode
      if (mode === 'iframe' && params.token) {
        try {
          // Update this URL to your Azure Functions endpoint
          const apiUrl = process.env.TOKEN_API_BASE_URL || 'https://4.222.185.132.nip.io/vas';
          const response = await fetch(`${apiUrl}/api/validate-token?token=${params.token}`);
          if (response.ok) {
            setTokenValid(true);
          } else {
            // Token invalid - show error or redirect
            console.error('Invalid token');
            // Could redirect or show error message
          }
        } catch (error) {
          console.error('Token validation error:', error);
        }
      } else if (mode !== 'iframe') {
        // Not in iframe mode, allow access
        setTokenValid(true);
      }
      
      setLoading(false);
    };

    validateToken();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!tokenValid) {
    return <div>Access denied. Invalid or expired token.</div>;
  }

  // Rest of app...
}
```

### 4. Environment Variables

**Azure Functions Configuration** (Azure Portal → Function App → Configuration):

```
IBANK_CLIENT_ID=your-ibank-client-id
IBANK_CLIENT_SECRET=your-ibank-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
```

**Frontend App Configuration** (Vercel environment variables):

```
TOKEN_API_BASE_URL=https://4.222.185.132.nip.io/vas
```

**Note**: The app URLs can also be hardcoded in the endpoint if environment variables are not preferred.

### 5. Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0"
  }
}
```

## Security Considerations

1. **HTTPS Only**: All communication must be over HTTPS
2. **Token Expiration**: Tokens expire after 1 hour (configurable)
3. **Client Authentication**: iBank credentials validated before token generation
4. **Rate Limiting**: Implement rate limiting on token endpoint
5. **Secret Management**: Store secrets in environment variables, never in code
6. **Token Storage**: Tokens passed via URL (HTTPS) or postMessage, not localStorage

## Operational Considerations

### Request Validation

- Incoming token requests are validated against a schema:
  - `clientId`, `clientSecret`, `app`, `sessionID` required
  - `app` must be one of `"airtime"` or `"bill-payments"`
  - `userId` optional

### Rate Limiting

- General API: 120 requests/minute
- Token requests: 30 requests/minute

### Health Check

```
GET /health
```

Returns status, uptime, and timestamp.

### Error Response Format

```json
{
  "error": "Human readable message",
  "code": "ERROR_CODE",
  "details": []
}
```

### Request Logging

All requests are logged via standard access logs.

## Testing

### 1. Test Token Generation

**For Bill Payments App:**
```bash
curl -X POST https://4.222.185.132.nip.io/vas/api/token/request \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-id",
    "clientSecret": "test-secret",
    "app": "bill-payments",
    "sessionID": "test-session-guid",
    "userId": "user123"
  }'
```

**For Airtime App:**
```bash
curl -X POST https://4.222.185.132.nip.io/vas/api/token/request \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-id",
    "clientSecret": "test-secret",
    "app": "airtime",
    "sessionID": "test-session-guid",
    "userId": "user123"
  }'
```

**Available App Values:**
- `"airtime"` - Airtime Top-Up App
- `"bill-payments"` - Bill Payments App

### 2. Test Token Validation

```bash
curl "https://4.222.185.132.nip.io/vas/api/validate-token?token=YOUR_TOKEN"
```

### 3. Test Iframe Embedding

```html
<iframe 
  src="https://h5-getbucks-bill-payments.vercel.app/?token=YOUR_TOKEN&mode=iframe&accountNumber=123456&clientNumber=789"
  width="100%"
  height="600px">
</iframe>
```

## Deployment

See `AZURE_DEPLOYMENT_GUIDE.md` for complete Azure Functions deployment instructions.

### Quick Deploy

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Login to Azure
az login

# Deploy function
func azure functionapp publish getbucks-token-api
```

## Next Steps

1. ✅ Review and approve implementation approach
2. ⏳ Set up Azure account and create Function App
3. ⏳ Set up environment variables in Azure
4. ⏳ Install dependencies (`jsonwebtoken`)
5. ⏳ Implement token endpoint (Azure Function)
6. ⏳ Implement token validation (Azure Function)
7. ⏳ Deploy to Azure
8. ⏳ Test integration
9. ⏳ Update frontend apps to use Azure API URL
10. ⏳ Share API documentation with iBank team

## Related Documentation

- `AZURE_DEPLOYMENT_GUIDE.md` - Complete Azure deployment guide
- `PROJECT_OVERVIEW_AND_SCOPE.md` - Full project scope
- `EMAIL_RESPONSE_DRAFT.md` - Integration documentation for iBank

