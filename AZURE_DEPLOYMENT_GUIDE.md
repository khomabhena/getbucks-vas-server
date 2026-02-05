# Azure Deployment Guide: Token Endpoint API

## Recommended Approach: Azure Functions (Serverless)

### Why Azure Functions?

1. **Serverless**: Pay only for what you use, auto-scales
2. **Node.js Native**: Full Node.js runtime support
3. **HTTP Triggers**: Perfect for REST API endpoints
4. **Easy Deployment**: Simple deployment process
5. **Cost-Effective**: Free tier available, then pay-per-execution
6. **Integrated**: Works seamlessly with Azure ecosystem

## Architecture

```
┌─────────────────┐
│  iBank System   │
└────────┬────────┘
         │
         │ POST /api/token/request
         │
         ▼
┌─────────────────┐
│ Azure Functions │
│  (Node.js API)  │
└────────┬────────┘
         │
         │ Return Token + URL
         │
         ▼
┌─────────────────┐
│  iBank Embeds   │
│     Iframe      │
└─────────────────┘
```

## Project Structure

```
token-api/
├── src/
│   ├── functions/
│   │   ├── tokenRequest.js      # POST /api/token/request
│   │   └── validateToken.js     # GET /api/validate-token
│   └── utils/
│       ├── jwt.js               # JWT helper functions
│       └── validation.js        # Input validation
├── host.json                    # Azure Functions config
├── package.json
├── .env.example
└── azure-deploy.yml            # GitHub Actions deployment (optional)
```

## Implementation

### 1. Initialize Azure Functions Project

```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Create new function app
func init token-api --javascript
cd token-api

# Create HTTP trigger function
func new --name tokenRequest --template "HTTP trigger" --authlevel "function"
func new --name validateToken --template "HTTP trigger" --authlevel "function"
```

### 2. Token Request Function

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

### 3. Token Validation Function

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

### 4. Package.json

```json
{
  "name": "getbucks-token-api",
  "version": "1.0.0",
  "description": "Token generation API for GetBucks H5 apps",
  "main": "index.js",
  "scripts": {
    "start": "func start",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "azure-functions-core-tools": "^4.0.0"
  }
}
```

### 5. host.json Configuration

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

### 6. Function.json (Auto-generated, but verify)

```json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

## Deployment

### Option 1: Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name getbucks-token-api-rg --location eastus

# Create storage account (required for Functions)
az storage account create \
  --name getbuckstokenstorage \
  --location eastus \
  --resource-group getbucks-token-api-rg \
  --sku Standard_LRS

# Create Function App
az functionapp create \
  --resource-group getbucks-token-api-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name getbucks-token-api \
  --storage-account getbuckstokenstorage

# Deploy function
func azure functionapp publish getbucks-token-api
```

### Option 2: Azure Portal

1. Go to Azure Portal → Create Resource
2. Search for "Function App"
3. Fill in details:
   - Name: `getbucks-token-api`
   - Runtime: Node.js 18 LTS
   - Region: Choose closest to users
4. Create Storage Account
5. Review + Create
6. Deploy code via VS Code extension or Azure CLI

### Option 3: GitHub Actions (CI/CD)

```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure Functions

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: getbucks-token-api
          package: '.'
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## Environment Variables

Set in Azure Portal → Function App → Configuration → Application Settings:

```
IBANK_CLIENT_ID=your-ibank-client-id
IBANK_CLIENT_SECRET=your-ibank-client-secret
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
```

Or via Azure CLI:

```bash
az functionapp config appsettings set \
  --name getbucks-token-api \
  --resource-group getbucks-token-api-rg \
  --settings \
    IBANK_CLIENT_ID="your-client-id" \
    IBANK_CLIENT_SECRET="your-secret" \
    JWT_SECRET="your-jwt-secret"
```

## API Endpoints

After deployment, your endpoints will be:

```
https://4.222.185.132.nip.io/vas/api/token/request
https://4.222.185.132.nip.io/vas/api/validate-token
https://4.222.185.132.nip.io/vas/health
```

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

## Testing

### Test Token Generation

```bash
curl -X POST https://4.222.185.132.nip.io/vas/api/token/request \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-id",
    "clientSecret": "test-secret",
    "app": "bill-payments",
    "sessionID": "test-session-guid"
  }'
```

### Test Token Validation

```bash
curl "https://4.222.185.132.nip.io/vas/api/validate-token?token=YOUR_TOKEN"
```

## Local Development

```bash
# Install dependencies
npm install

# Start local function runtime
func start

# Functions will be available at:
# http://localhost:7071/api/token/request
# http://localhost:7071/api/validate-token
```

## Alternative: Azure App Service

If you prefer a traditional web server approach instead of serverless:

### Express.js on Azure App Service

```javascript
// server.js
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());

app.post('/api/token/request', async (req, res) => {
  // Same logic as Azure Functions
});

app.get('/api/validate-token', async (req, res) => {
  // Same logic as Azure Functions
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Deploy to App Service:**
```bash
az webapp create \
  --resource-group getbucks-token-api-rg \
  --plan getbucks-token-api-plan \
  --name getbucks-token-api \
  --runtime "NODE:18-lts"

az webapp deployment source config-zip \
  --resource-group getbucks-token-api-rg \
  --name getbucks-token-api \
  --src deploy.zip
```

## Cost Comparison

### Azure Functions (Consumption Plan)
- **Free Tier**: 1M requests/month free
- **After Free**: $0.20 per million requests
- **Compute**: Pay per execution time
- **Best for**: Variable traffic, cost-effective

### Azure App Service
- **Free Tier**: Limited (not recommended for production)
- **Basic Plan**: ~$13/month
- **Standard Plan**: ~$73/month
- **Best for**: Predictable traffic, always-on requirement

## Security Best Practices

1. **HTTPS Only**: Azure Functions enforce HTTPS by default
2. **Function Keys**: Use function-level authentication keys
3. **Key Vault**: Store secrets in Azure Key Vault
4. **CORS**: Configure CORS for allowed origins
5. **Rate Limiting**: Implement rate limiting (can use Azure API Management)

## Monitoring

- **Application Insights**: Built-in monitoring
- **Logs**: View in Azure Portal → Function App → Logs
- **Metrics**: Monitor execution count, duration, errors

## Next Steps

1. ✅ Choose Azure Functions or App Service
2. ⏳ Set up Azure account and resources
3. ⏳ Create function app
4. ⏳ Deploy code
5. ⏳ Configure environment variables
6. ⏳ Test endpoints
7. ⏳ Update frontend apps to use new API URL
8. ⏳ Share API documentation with iBank

