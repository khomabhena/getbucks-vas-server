# Framework Recommendation for Token Endpoint Development

## Recommended Approach: Azure Functions (Node.js)

### Why This Approach?

1. **Azure Hosting**: User requirement to host on Azure
2. **Serverless**: Azure Functions provides serverless architecture - pay only for what you use
3. **Node.js Native**: Full Node.js runtime support (Node.js 18 LTS)
4. **No Framework Overhead**: Simple Node.js modules - no Express, no Hono, no extra dependencies
5. **Minimal Dependencies**: Only need `jsonwebtoken` for JWT generation
6. **Perfect Fit**: Designed specifically for this use case (token generation, validation)
7. **Scalable**: Auto-scales with demand
8. **Cost-Effective**: Free tier available, then pay-per-execution

## Architecture

```
token-api/                         # Separate Azure Functions project
├── src/
│   └── functions/
│       ├── tokenRequest.js      # POST /api/token/request
│       └── validateToken.js    # GET /api/validate-token
├── host.json                     # Azure Functions config
└── package.json

bill-payments-app/                # Existing React frontend (Vercel)
├── src/                          # React frontend
├── package.json
└── vercel.json
```

## Implementation

### 1. Azure Function Structure

Each function is a simple Node.js module that exports an async function:

```javascript
// src/functions/tokenRequest.js
module.exports = async function (context, req) {
  // Handle request
  // Generate JWT
  // Return response via context.res
};
```

### 2. Dependencies Needed

Only one new dependency:
```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 3. Benefits

✅ **Simple**: No framework to learn or configure  
✅ **Fast**: Minimal overhead, optimized for Azure  
✅ **Scalable**: Auto-scales with Azure's infrastructure  
✅ **Cost-effective**: Free tier (1M requests/month), then pay-per-execution  
✅ **Azure Integration**: Works seamlessly with Azure ecosystem (Key Vault, Application Insights, etc.)  
✅ **Production-ready**: Enterprise-grade hosting and monitoring  

## Alternative Options (Not Recommended)

### ❌ Express.js
- **Why not**: Overkill for simple serverless functions
- **Overhead**: Adds unnecessary complexity and bundle size
- **Use case**: Better for full Node.js servers, not serverless

### ❌ Hono
- **Why not**: Unnecessary abstraction layer
- **Overhead**: Additional dependency and learning curve
- **Use case**: Better for edge functions with complex routing

### ❌ Next.js API Routes
- **Why not**: This isn't a Next.js project
- **Migration**: Would require converting entire project to Next.js
- **Use case**: Only if we were rebuilding the project

### ❌ Separate Backend Service
- **Why not**: Adds deployment complexity
- **Overhead**: Need separate hosting, CORS configuration, etc.
- **Use case**: Only if we needed a full backend with database, etc.

## Example Implementation

### Basic Azure Function

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
    const { clientId, clientSecret, app, sessionID } = req.body;

    // Validate credentials
    if (clientId !== process.env.IBANK_CLIENT_ID || 
        clientSecret !== process.env.IBANK_CLIENT_SECRET) {
      context.res = {
        status: 401,
        body: { error: 'Invalid credentials' }
      };
      return;
    }

    // Validate app
    const validApps = ['airtime', 'bill-payments'];
    if (!validApps.includes(app)) {
      context.res = {
        status: 400,
        body: { error: 'Invalid app parameter' }
      };
      return;
    }

    // Generate token
    const token = jwt.sign(
      {
        clientId,
        app,
        sessionID,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Get base URL based on app
    const baseUrl = app === 'airtime' 
      ? process.env.AIRTIME_APP_URL 
      : process.env.BILL_PAYMENTS_APP_URL;

    context.res = {
      status: 200,
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

## Development Workflow

### Local Development

Azure Functions Core Tools provides local development:
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Start local function runtime
func start
```

This will:
- Run functions locally at `http://localhost:7071`
- Simulate Azure Functions environment
- Support hot-reload during development

### Testing

```bash
# Test token endpoint locally
curl -X POST http://localhost:7071/api/token/request \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-id",
    "clientSecret": "test-secret",
    "app": "bill-payments",
    "sessionID": "test-session-id"
  }'
```

## Environment Variables

**Azure Functions** (Azure Portal → Function App → Configuration):

```env
IBANK_CLIENT_ID=your-client-id
IBANK_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
```

**Local Development** (`.env` file in token-api folder):

```env
IBANK_CLIENT_ID=your-client-id
IBANK_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
```

**Frontend App** (Vercel environment variables):

```env
TOKEN_API_BASE_URL=https://4.222.185.132.nip.io/vas
```

## File Structure

```
token-api/                      # New Azure Functions project
├── src/
│   └── functions/
│       ├── tokenRequest.js    # POST /api/token/request
│       └── validateToken.js  # GET /api/validate-token
├── host.json                   # Azure Functions config
└── package.json                # Add jsonwebtoken

bill-payments-app/              # Existing React app (Vercel)
├── src/
│   ├── App.jsx                # Add token validation here
│   └── services/
│       └── bankPaymentService.js  # Add sessionID to payload
└── ...
```

## Summary

**Use Azure Functions (Node.js)** - it's the best solution for hosting on Azure.

- ✅ No framework needed
- ✅ Minimal dependencies
- ✅ Perfect for serverless API endpoints
- ✅ Easy to implement and maintain
- ✅ Production-ready and scalable
- ✅ Azure hosting as required
- ✅ Cost-effective with free tier

## Deployment

See `AZURE_DEPLOYMENT_GUIDE.md` for complete deployment instructions.

### Quick Deploy

```bash
# Login to Azure
az login

# Deploy function
func azure functionapp publish getbucks-token-api
```

