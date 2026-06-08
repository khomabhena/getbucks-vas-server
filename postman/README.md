# Postman — VAS API collections

Two collections are available:

| Collection | Environment | Use when |
|------------|-------------|----------|
| **Getbucks VAS BFF** | `Getbucks-VAS-BFF.environment.json` | Testing **24-getbucks-vas-server** (`/api/vas/*`) locally or on a deployed BFF |
| **VAS Live (cleaned)** | `VAS-Live.environment.json` | Calling **VAS upstream** directly (`https://vas-live.azurewebsites.net/V2/*`) |

---

## Getbucks VAS BFF (recommended)

Import:

- `Getbucks-VAS-BFF.collection.json`
- `Getbucks-VAS-BFF.environment.json`

Select environment **Getbucks VAS BFF (local)**.

### Prerequisites

1. Start the server: `npm run dev` (default port **3001**).
2. In server `.env`, set:
   - `VAS_API_BASE_URL`, `VAS_SUBSCRIPTION_KEY`, `VAS_MERCHANT_ID`, `VAS_SIGNATURE`
   - For H5 token requests: `JWT_SECRET`, `IBANK_CLIENT_ID`, `IBANK_CLIENT_SECRET`
3. In Postman environment, copy `IBANK_CLIENT_ID` / `IBANK_CLIENT_SECRET` into `iBankClientId` / `iBankClientSecret`.

Merchant auth headers are **not** sent from Postman — the BFF adds them when proxying to VAS.

### Catalog flow

Run **VAS Catalog** in order:

| Step | BFF endpoint |
|------|----------------|
| 0 | `GET /api/vas/catalog/connect` |
| 1 | `GET /api/vas/catalog/services` |
| 2 | `GET /api/vas/catalog/countries?service={{serviceId}}` |
| 3 | `GET /api/vas/catalog/service-providers?countryCode=&service=` |
| 4 | `GET /api/vas/catalog/products?countryCode=&service=` |
| 5 | `GET /api/vas/catalog/products/:id` |

**Catalog — quick picks** has airtime, bundles, electricity, and entertainment shortcuts.

### Service IDs (live)

| serviceId | Name |
|-----------|------|
| `1` | Mobile Airtime |
| `3` | Mobile Bundles |
| `6` | Electricity |
| `13` | Entertainment |

### Payments

Folder **VAS Payment**:

1. `POST /api/vas/payment/validate`
2. `POST /api/vas/payment`

Use the same `requestId` for validate and post in one run (auto-generated GUID per request).

⚠️ Upstream is **live** — payments can charge real funds.

### Key environment variables

| Variable | Purpose |
|----------|---------|
| `bffBaseUrl` | `http://localhost:3001` (change for deployed BFF) |
| `serviceId` | From services response |
| `countryCode` | Usually `ZW` |
| `serviceProvider` | From service-providers (e.g. all-network airtime id) |
| `productId` / `productIdAirtime` / `productIdBundle` | Product to pay |
| `paymentAmount`, `currency`, `mobileNumber` | Payment body |
| `iBankClientId`, `iBankClientSecret` | H5 token request |

---

## VAS Live (upstream direct)

Import **`VAS-Live.collection.json`** and **`VAS-Live.environment.json`**.

You must send merchant headers on every request (`subscriptionKey`, `merchantId`, `signature`, `requestTimestamp`).

See the **Catalog** and **Payments** folders in that collection.

---

## Deployed BFF

Duplicate the **Getbucks VAS BFF** environment and set `bffBaseUrl` to your production URL (e.g. `https://your-vas-bff.example.com`).
