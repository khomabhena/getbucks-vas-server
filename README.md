# GetBucks VAS Server

BFF for H5 apps, VAS (airtime/bills), and BankWare.

## Project layout

```
src/
  app.js
  index.js
  routes/
    index.js                 # route map + mounts (routerStatus, routerH5Token, …)
    status.route.js          # export routerStatus
    h5.token.route.js        # export routerH5Token
    vas.catalog.route.js     # export routerVasCatalog
    vas.payment.route.js     # export routerVasPayment
    vas.legacy.route.js      # export routerVasLegacy (deprecated alias)
    bankware.route.js        # export routerBankware
  controller/
    status.controller.js
    h5.token.controller.js
    vas.catalog.controller.js
    vas.payment.controller.js
    bankware.controller.js
  services/
    h5.token.service.js
    vas.service.js
    bankware.service.js
  config/
  middleware/
  schemas/
  utils/
```

**Pattern:** `*.route.js` wires URLs → `*.controller.js` handles HTTP → `services/` calls upstream APIs.

Full endpoint list: see comment block in `src/routes/index.js`.

## Run

```bash
npm run dev
```

## Env

See `.env` — `JWT_SECRET`, `IBANK_*`, `VAS_*` (or legacy `HOT_RECHARGE_*`), `BANKWARE_*`.
