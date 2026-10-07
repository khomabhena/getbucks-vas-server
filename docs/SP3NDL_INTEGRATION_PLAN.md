# Sp3ndl (South Africa) integration plan

Add South Africa (`ZA`) to the Tapseed bill payments and airtime H5 apps, served by Sp3ndl through the
Appleseed SuperAppGateway. Zimbabwe and other countries keep using VAS (ZB) unchanged.

## 1. What Sp3ndl exposes (UAT, verified 7 Oct 2026)

Base URL (UAT): `https://appleseed-uat2.azurewebsites.net` — spec at `/swagger/v1/swagger.json`
("SuperAppGateway 1.0", 122 paths). Auth headers are the same style as VAS today:
`MerchantId`, `Ocp-Apim-Subscription-Key`, `RequestTimestamp`, `Signature` (not documented in the spec;
UAT accepts a static timestamp and signature).

| Endpoint | Purpose | Verified |
|---|---|---|
| `GET /spendl/V2/SpendlProducts?service=&serviceProvider=&vouchers=&parentProduct=` | Catalog | Yes — 70 products, `Status: FOUND` |
| `GET /spendl/V2/SpendlProduct?id=` | One product | Yes |
| `POST /spendl/V2/ValidateSpendlPayment` | Validate / quote | Not called yet |
| `POST /spendl/V2/PostSpendlPayment` | Pay | Not called yet |
| `GET /spendl/V2/SpendlPaymentStatus?id={RequestId}` | Status | Yes — `SUCCESSFUL`, ReferenceNumber `126417` |

Validate and post share one request body (all fields required):

```json
{
  "RequestId": "<guid>",
  "AppleseedAccountId": "<from Sp3ndl>",
  "ProductId": "SP_140",
  "Currency": "ZAR",
  "Amount": 50,
  "CreditPartyIdentifiers": [{ "IdentifierFieldName": "mobile", "IdentifierFieldValue": "0821234567" }],
  "TerminalId": "<from Sp3ndl>"
}
```

Responses use the same shape as VAS V2, so the apps can consume them as-is:

- Validate: `RequestId, Status, ResultMessage, DisplayData[], TotalPayableAmountCalculations { PrincipalAmount, TotalCharges, TotalAmount }`
  (no `BillerCharge` / `TaxCharge`; the apps already default those to 0).
- Post / status: `RequestId, Status, ResultMessage, ReferenceNumber, DisplayData[], Vouchers[], ResultInformation, ReceiptHTML[], ReceiptSmses[]`.

### Catalog (UAT, all ZAR)

| Service | Count | Examples |
|---|---|---|
| Mobile Airtime Top-up | 8 | Vodacom Direct (SP_166), Telkom Direct (SP_165), Capitec Connect (SP_162), Mock Success / Out Of Stock / Timeout (SP_76 / SP_74 / SP_78) |
| Mobile Airtime Vouchers | 2 | MTN R10 (SP_67), AnyTime Airtime (SP_60) |
| Pre-paid Electricity | 1 | Electricity Token (SP_140), R1–R9999 |
| Entertainment | 5 | Showmax, Spotify, Roblox |
| Vouchers / Giftcards / Online Shopping / Tickets | 48 | PnP, Takealot, Uber |
| Money Transfer / Cashless Withdrawal | 6 | FNB e-wallet, ABSA CashSend, PayShap, RTC EFT |

Differences from VAS that drive the design:

- No `Services`, `Countries` or `ServiceProviders` endpoints, and `ServiceProvider.Country` is empty —
  services and providers must be derived from the product list.
- Every product has the same 17 identifiers. Four are required on all products:
  `firstname`, `surname`, `idNumber`, `mobile`. The rest (`accountNumber`, `email`, bank fields, ...) are optional.
  The catalog does not say which field carries the meter number or the airtime recipient.
- Validate/post need `AppleseedAccountId` and `TerminalId` instead of VAS `POSDetails` / `PaymentChannel` / `Quantity`.
- Only one bill category (electricity). No DSTV, municipal, insurance or school fees.

## 2. Architecture

```
Tapseed bill payments / airtime H5
        │  (unchanged endpoints: /api/vas/catalog/*, /api/vas/payment/*)
        ▼
GetBucks VAS server (BFF)
        ├── countryCode ≠ ZA, ProductId ≠ SP_*  → VAS (vas-live)      [today]
        └── countryCode = ZA or ProductId SP_*  → Sp3ndl (appleseed)  [new]
```

Routing in the server keeps the apps almost unchanged and keeps keys server-side.

## 3. VAS server changes

1. **Config** (`src/config/env.js`, `.env.example`): `SPENDL_API_BASE_URL`, `SPENDL_SUBSCRIPTION_KEY`,
   `SPENDL_MERCHANT_ID`, `SPENDL_SIGNATURE`, `SPENDL_APPLESEED_ACCOUNT_ID`, `SPENDL_TERMINAL_ID`.
2. **`src/services/spendl.service.js`**: `getProducts`, `getProduct`, `validatePayment`, `postPayment`,
   `getPaymentStatus`, reusing the VAS header builder. Cache the product list (one call returns everything).
3. **Catalog routing** (`vas.catalog.controller.js`), when `countryCode=ZA`:
   - `/services`: unique `Service { Id, Name }` from products.
   - `/service-providers?service=`: unique `ServiceProvider` for that service, with `Country: ZA` filled in.
   - `/products?service=&serviceProviderId=` and `/products/:id` for `SP_*`: Sp3ndl products.
   - Allow `ZAR` in `utils/currency.js` for ZA only; hide `Mock` products outside UAT.
4. **Payment routing** (`vas.payment.controller.js`), when `ProductId` starts with `SP_`:
   build the Sp3ndl body (add `AppleseedAccountId`, `TerminalId`, `Currency: ZAR`), map identifiers
   (section 4), and skip the VAS-only normalisation (`POSDetails`, `PaymentChannel`, `Quantity`).
5. **Status**: new `GET /api/vas/payment/status/:requestId` → `SpendlPaymentStatus`, so the apps can
   poll pending / timed-out payments (test with Mock Timeout SP_78).

## 4. Identifier mapping

Proposed until Sp3ndl confirms:

| Sp3ndl field | Source |
|---|---|
| `firstname`, `surname`, `mobile` | SuperApp profile (already loaded in `AccountInput` customer details); ask only if missing |
| `idNumber` | Customer enters once (SA ID / passport), unless the SuperApp profile has it |
| Recipient mobile (airtime) | `mobile`? — to confirm |
| Meter number (electricity) | `accountNumber`? — to confirm |

In the apps, the four identity fields should not appear as biller fields; they are prefilled or asked for once
in a "Your details" block. Only the recipient field (meter / mobile number) is shown as the account field.

## 5. Tapseed app changes

**Bill payments (`06-h5-bill-payments`)**

- Country-aware currency: ZA → ZAR (today `catalogCurrency.js` is USD only).
- Services shown for ZA: Pre-paid Electricity and Entertainment. Hide Money Transfer and Cashless Withdrawal
  (they need beneficiary bank details); vouchers and gift cards to decide.
- Identity fields as in section 4.
- Service charge: the USD min/max don't apply to ZAR; agree ZAR limits (e.g. R2 min, R90 max).
- Pending handling: poll the new status endpoint when PostPayment times out or returns pending.

**Airtime (`04-h5-airtime`)**

- Already fetches via `vasCatalogService` with `countryCode`, so ZA products arrive through the same routing.
- Products: Vodacom, Telkom, Capitec Connect (variable amount), MTN R10 and AnyTime vouchers.
  No Cell C and no MTN direct top-up in UAT.

## 6. Open questions

For Sp3ndl / Appleseed:

1. `AppleseedAccountId` and `TerminalId` values for UAT and production.
2. Production `Signature` / `RequestTimestamp` algorithm (UAT accepts static values).
3. Which identifier carries the meter number and the airtime recipient? Are `firstname` / `surname` /
   `idNumber` / `mobile` the payer's details (KYC) or the recipient's? Is `idNumber` mandatory for airtime?
4. Meaning of `TotalCharges` and who bears it.
5. Full list of `Status` values (e.g. `SUCCESSFUL`, `PENDING`, `FAILED`), timeout and reversal behaviour.
6. Settlement: is the merchant account prefunded in ZAR?
7. Production base URL and keys; whether `SP_*` product IDs are stable between UAT and production.

For us:

1. Can the SuperApp wallet charge in ZAR, or is it USD only? If USD, we need an FX rate source and rounding rules.
2. Which ZA services to show in bill payments.
3. ZAR service charge limits.

## 7. Phases

1. **Discovery**: answers to the open questions; one validate call on Mock Success (SP_76) to confirm the shape.
2. **Server**: Sp3ndl service, catalog and payment routing, status endpoint (UAT).
3. **Bill payments app**: currency, identity fields, service filter, status polling.
4. **Airtime app**: ZA carriers and products.
5. **UAT end to end** with the mock products (success, out of stock, timeout), then production keys.
