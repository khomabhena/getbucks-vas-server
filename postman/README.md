# VAS Live — Postman

Import **`VAS-Live.collection.json`** and **`VAS-Live.environment.json`**, then select the **VAS Live** environment.

## Catalog flow (main use case)

Run the **Catalog** folder in order:

| Step | Request | Endpoint |
|------|---------|----------|
| 1 | List services | `GET /V2/Services` |
| 2 | List countries for service | `GET /V2/Countries?service={{serviceId}}` |
| 3 | Products in service | `GET /V2/Products?countryCode={{countryCode}}&service={{serviceId}}` |
| 4 | Single product (optional) | `GET /V2/Product?id={{productId}}` |

After step 1, set **`serviceId`** in the environment (e.g. `1` = Mobile Airtime).

After step 2, **`countryCode`** is auto-set (usually `ZW`).

Step 3 logs product IDs in the Postman console; the first product id is saved to **`productIdAirtime`**.

### Service IDs (live)

| serviceId | Name |
|-----------|------|
| `1` | Mobile Airtime |
| `3` | Mobile Bundles |
| `6` | Electricity |
| `13` | Entertainment (DSTV, etc.) |

**Catalog — quick picks by service** has the same products call pre-filled for each service.

## Key environment variables

- `baseUrl` — `https://vas-live.azurewebsites.net`
- `serviceId` — chosen from Services response
- `countryCode` — chosen from Countries response (default `ZW`)
- `subscriptionKey`, `merchantId`, `signature` — merchant auth headers

`requestTimestamp` is refreshed automatically before each request.

## Payments

See the **Payments** folder. Post Payment can charge real funds on live.
