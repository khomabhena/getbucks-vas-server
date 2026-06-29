# VAS Catalog — BFF guide

How **24-getbucks-vas-server** proxies VAS `/V2/*` catalog calls for the **Airtime** and **Bill Payments** H5 apps.

Merchant headers (`Ocp-Apim-Subscription-Key`, `MerchantId`, `Signature`, `RequestTimestamp`) are added by the BFF from server `.env`. Clients only call `/api/vas/catalog/*`.

---

## Base URL

| Environment | Base |
|-------------|------|
| Local | `http://localhost:3001` |
| Deployed | `https://4.222.185.132.nip.io/vas` |

All paths below are relative to that base.

---

## Endpoints

| BFF | VAS upstream | Purpose |
|-----|--------------|---------|
| `GET /api/vas/catalog/connect` | `/V2/Connect` | Health |
| `GET /api/vas/catalog/services` | `/V2/Services` | List service types |
| `GET /api/vas/catalog/countries?service=` | `/V2/Countries` | Countries for a service |
| `GET /api/vas/catalog/service-providers?countryCode=&service=` | `/V2/ServiceProviders` | Providers (Econet, ZESA, DSTV, …) |
| `GET /api/vas/catalog/products?…` | `/V2/Products` | Products **or** categories |
| `GET /api/vas/catalog/products/:id?currency=` | `/V2/Product` | Single product |
| `GET /api/accounts/:accountNumber/currency` | BankWare account | `vasCurrency` for catalog filter |

### Products query parameters (forwarded to VAS)

| Param | Required | Notes |
|-------|----------|-------|
| `countryCode` | Usually | e.g. `ZW` |
| `service` | Usually | Service id from `/services` |
| `serviceProvider` | Optional | Provider id; H5 may send `serviceProviderId` (BFF maps it) |
| `currency` | Optional | `USD` (default), `ZWG`, `ZIG`, or `ZWL` — see [Currency](#currency) |
| `parentProduct` | Optional | Category id (`PC_…`) — returns child products |
| `mobileNumber` | Optional | Some catalogs use MSISDN filter |
| `productType` | Optional | e.g. `VariableAmount` |

---

## Catalog flows

### A — Flat products (classic)

Used when products are directly purchasable (no category folder).

```
services → countries → service-providers → products → payment
```

**Airtime H5:** phone → carrier → `products?countryCode=ZW&service=1|2|3&serviceProvider=…`

**Bill payments H5:** service → provider → `products?countryCode=ZW&service=6&serviceProvider=…`

### B — Category drill-down (`parentProduct`)

VAS can return **category rows** first; children are loaded with `parentProduct`.

```
services → countries → service-providers → products (top level)
    → if IsCategory: true → products?parentProduct=PC_…
    → payment (leaf product only)
```

Applies to **both** airtime and bill payments whenever VAS returns `IsCategory: true` rows.

#### Category row (`IsCategory: true`)

- `Id` starts with `PC_` (example: `PC_a8238734-bbbd-4ce2-999d-fb27397ef2d8`)
- `IsCategory: true`
- `Price: 0`, `ProductType: null`
- **Not payable** — navigation only

#### Leaf row (`IsCategory: false`)

- `CategoryId` points to parent `PC_…`
- `ProductType`: `FixedAmount` or `VariableAmount`
- `Price > 0` (or variable min/max)
- **Payable** — use this `Id` in validate/post payment

#### Example — Airtime vouchers (USD)

**Step 1 — top level** (may return categories):

```http
GET /api/vas/catalog/products?countryCode=ZW&service=1&serviceProvider=PC_ECONET&currency=USD
```

Response includes a category:

```json
{
  "Id": "PC_a8238734-bbbd-4ce2-999d-fb27397ef2d8",
  "Name": "Buddie Airtime Vouchers",
  "IsCategory": true,
  "Price": 0,
  "Service": { "Id": 1, "Name": "Mobile Airtime Top-up" }
}
```

**Step 2 — children**:

```http
GET /api/vas/catalog/products?parentProduct=PC_a8238734-bbbd-4ce2-999d-fb27397ef2d8&currency=USD
```

Returns leaf vouchers (`PN_ECONET_econet-buddie-usd1`, …) with `ReturnsVouchers: true`, `SpecifyQuantity: true`, and `CreditPartyIdentifiers` using `MemberNumber` (not `AccountNumber`).

Upstream reference: `https://vas-live.azurewebsites.net/V2/Products?parentProduct=PC_a8238734-bbbd-4ce2-999d-fb27397ef2d8`

#### Example — Bill payments

Same pattern for utilities/education when VAS groups products under categories:

```http
GET /api/vas/catalog/products?countryCode=ZW&service=6&serviceProvider=…
```

If any row has `IsCategory: true`:

```http
GET /api/vas/catalog/products?parentProduct={{categoryId}}&currency={{vasCurrency}}
```

Then validate/post with the **leaf** `ProductId`.

---

## Currency

| Input | BFF `vasCurrency` | Product filter |
|-------|-------------------|----------------|
| (omitted) | `USD` | USD products |
| `USD` | `USD` | USD products |
| `ZWG`, `ZIG`, `ZWL` | `ZWG` | ZWG + ZWL-tagged products (alias match) |

**H5 flow:**

1. `GET /api/accounts/{accountNumber}/currency` → `vasCurrency`
2. Pass `currency={{vasCurrency}}` on every `products` call

For **ZWG accounts**, the BFF fetches products without upstream `currency=` (VAS splits `ZWG` vs `ZWL` tags) and post-filters by alias so DSTV (`ZWL`) is not dropped.

---

## H5 app mapping

| App | Navigation | Catalog calls |
|-----|------------|---------------|
| **Airtime** | Phone → Airtime/Data/Bundles tabs → (optional) category → product | `service-providers` + `products` (+ `parentProduct`) |
| **Bill payments** | Service → provider → (optional) category → product → account | `services` + `service-providers` + `products` (+ `parentProduct`) |

### UI rules for H5 implementers

1. After `products`, split rows: `IsCategory === true` → show category picker; else → show product list.
2. On category tap, call `products?parentProduct={category.Id}&currency=…`.
3. Never call payment with a category id (`PC_…`).
4. Use `CreditPartyIdentifiers` from the **leaf** product for account/meter/member number fields.
5. If `ReturnsVouchers: true`, expect voucher in payment response; may need `Quantity` when `SpecifyQuantity: true`.

---

## Payments (after product selected)

```http
POST /api/vas/payment/validate
POST /api/vas/payment
```

Body uses leaf `ProductId`, `Amount`, `Currency`, `CreditPartyIdentifiers`, etc. Same for airtime and bills.

Bank debit: `POST /api/getbucks/api/v2/account-transfers` (via H5 `bankPaymentService`).

---

## Postman

Import `Getbucks-VAS-BFF.collection.json` + `Getbucks-VAS-BFF.environment.json`.

Folders:

- **VAS Catalog** — full drill-down (steps 0–5)
- **Catalog — categories (parentProduct)** — airtime vouchers + bill category pattern
- **Catalog — quick picks** — flat shortcuts

See `postman/README.md` for setup.

---

## Service IDs (ZW, common)

| Id | Name | Typical app |
|----|------|-------------|
| `1` | Mobile Airtime | Airtime |
| `2` | Mobile Data | Airtime |
| `3` | Mobile Bundles | Airtime |
| `6` | Electricity | Bills |
| `13` | Entertainment | Bills |
| `26` | Mobile Airtime Vouchers | Airtime (voucher leaf products) |

Always confirm live ids via `GET /api/vas/catalog/services`.
