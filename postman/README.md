# Postman — VAS API collections

Two collections are available:

| Collection | Environment | Use when |
|------------|-------------|----------|
| **Getbucks VAS BFF** | `Getbucks-VAS-BFF.environment.json` | Testing **24-getbucks-vas-server** (`/api/vas/*`) locally or on a deployed BFF |
| **VAS Live (cleaned)** | `VAS-Live.environment.json` | Calling **VAS upstream** directly (`https://vas-live.azurewebsites.net/V2/*`) |

**Full catalog guide (flat + category flows, currency, airtime + bills):** [`CATALOG.md`](CATALOG.md)

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

### Catalog flows

#### Flat products (classic)

Run **VAS Catalog** in order:

| Step | BFF endpoint |
|------|----------------|
| 0 | `GET /api/vas/catalog/connect` |
| 1 | `GET /api/vas/catalog/services` |
| 2 | `GET /api/vas/catalog/countries?service={{serviceId}}` |
| 3 | `GET /api/vas/catalog/service-providers?countryCode=&service=` |
| 4 | `GET /api/vas/catalog/products?countryCode=&service=&currency=` |
| 5 | `GET /api/vas/catalog/products/:id` |

Use when products are directly purchasable (`IsCategory: false`).

#### Category drill-down (`parentProduct`)

When step 4 returns rows with **`IsCategory: true`** (ids like `PC_…`, `Price: 0`):

| Step | BFF endpoint |
|------|----------------|
| 4a | Same as step 4 — pick a category row |
| 4b | `GET /api/vas/catalog/products?parentProduct={{parentProductId}}&currency=` |
| 5 | `GET /api/vas/catalog/products/:leafProductId` |

Folder **Catalog — categories (parentProduct)** has airtime voucher and bill examples.

Applies to **airtime** and **bill payments** H5 apps.

### Account currency

Before catalog (matches H5 iframe flow):

```http
GET /api/accounts/{{accountNumber}}/currency
```

Use `vasCurrency` from the response as `currency` on product calls (`USD` or `ZWG`).

### Service IDs (live)

| serviceId | Name | App |
|-----------|------|-----|
| `1` | Mobile Airtime | Airtime |
| `2` | Mobile Data | Airtime |
| `3` | Mobile Bundles | Airtime |
| `6` | Electricity | Bills |
| `13` | Entertainment | Bills |
| `26` | Mobile Airtime Vouchers | Airtime (leaf vouchers under categories) |

### Payments

Folder **VAS Payment**:

1. `POST /api/vas/payment/validate`
2. `POST /api/vas/payment`

Use the **leaf** product id (not a category `PC_…` id). Same `requestId` for validate and post.

⚠️ Upstream is **live** — payments can charge real funds.

### Key environment variables

| Variable | Purpose |
|----------|---------|
| `bffBaseUrl` | `http://localhost:3001` (change for deployed BFF) |
| `accountNumber` | For `/api/accounts/.../currency` |
| `serviceId` | From services response |
| `countryCode` | Usually `ZW` |
| `serviceProvider` | From service-providers |
| `parentProductId` | Category id (`PC_…`) for step 4b |
| `productId` / `productIdAirtime` / `productIdBundle` | Leaf product to pay |
| `currency` | `USD` or `ZWG` — match account `vasCurrency` |
| `paymentAmount`, `mobileNumber` | Payment body |
| `iBankClientId`, `iBankClientSecret` | H5 token request |

---

## VAS Live (upstream direct)

Import **`VAS-Live.collection.json`** and **`VAS-Live.environment.json`**.

You must send merchant headers on every request (`subscriptionKey`, `merchantId`, `signature`, `requestTimestamp`).

See the **Catalog** and **Payments** folders in that collection.

---

## Deployed BFF

Duplicate the **Getbucks VAS BFF** environment and set `bffBaseUrl` to your production URL (e.g. `https://4.222.185.132.nip.io/vas`).
