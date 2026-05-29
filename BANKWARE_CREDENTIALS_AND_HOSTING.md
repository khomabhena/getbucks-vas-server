# BankWare Credentials & Hosting – Way Forward

## ⚠️ Critical: Do Not Expose Credentials in the Frontend

The H5 apps (Airtime & Bill Payments) use **Vite**. Any env var prefixed with `VITE_` is **embedded into the client-side JavaScript bundle** at build time. So if you set these on Vercel (or any host) for the H5 apps:

- `VITE_GETBUCKS_USERNAME`
- `VITE_GETBUCKS_PASSWORD`
- `VITE_GETBUCKS_API_URL`
- `VITE_GETBUCKS_SYSTEM_ID`
- `VITE_GETBUCKS_GRANT_TYPE`

**they will be visible to anyone** who opens the deployed app (DevTools → Sources, Network, or “View source”). That would allow anyone to call the BankWare API with your credentials.

**Action:** Treat the password you use for production as sensitive. If it was ever committed or deployed in a `VITE_*` variable, **rotate it** with the GetBucks/BankWare team.

---

## Recommended Approach: Backend Proxy (Production-Safe)

Keep credentials **only on the server**. The browser talks to your backend; the backend talks to BankWare.

### Hosting Summary

| What | Where | Why |
|------|--------|-----|
| **H5 Airtime app** | Vercel | Static frontend; no secrets in build. |
| **H5 Bill Payments app** | Vercel | Same. |
| **VAS server** (token + optional BankWare proxy) | Azure / Railway / Render / Fly.io / VM | Server-side env for secrets; can proxy BankWare calls. |

- **Vercel:** Use only **non-secret** `VITE_*` vars (e.g. `VITE_TOKEN_API_BASE_URL`, `VITE_GETBUCKS_API_URL` can be the **public** BankWare URL if the app no longer calls it directly; see below). **Never** put `VITE_GETBUCKS_USERNAME` or `VITE_GETBUCKS_PASSWORD` on Vercel for the H5 apps.
- **Backend (e.g. this VAS server):** Store and use:
  - `GETBUCKS_API_URL=http://s-bwopenapi.getbucks.co.zw`
  - `GETBUCKS_USERNAME=...`
  - `GETBUCKS_PASSWORD=...`
  - `GETBUCKS_SYSTEM_ID=live`
  - `GETBUCKS_GRANT_TYPE=password`

---

## Option A: Add BankWare Proxy to VAS Server (Recommended)

1. **Extend this repo (24-getbucks-vas-server)** with two server-side endpoints that use the credentials from **server env** (no `VITE_`):

   - **`POST /api/bankware/token`**  
     - Backend calls `POST {GETBUCKS_API_URL}/token` with `grant_type`, `username`, `password`, `systemId`.  
     - Returns a short-lived token (or a wrapper) to the client.  
     - Optional: require a valid VAS token or API key so only your H5 app can call this.

   - **`POST /api/bankware/account-transfers`**  
     - Client sends the transfer payload (e.g. `externalReference`, `debitAccount`, `creditAccount`, amounts, narratives, `sessionID`, etc.).  
     - Backend gets a BankWare token (using the same credentials or a cached token), calls BankWare `POST /api/v2/account-transfers`, returns the response.

2. **H5 apps (Airtime & Bill Payments)**  
   - Change `GetBucksAuth` and `GetBucksAPI` to call your backend instead of BankWare directly:
     - Auth: `POST {VAS_BASE_URL}/api/bankware/token` → use returned token.
     - Transfers: `POST {VAS_BASE_URL}/api/bankware/account-transfers` with the same payload they use today.
   - In the H5 app, the only `VITE_*` you need for BankWare is the **VAS base URL**, e.g. `VITE_VAS_API_BASE_URL=https://4.222.185.132.nip.io/vas` (or your production VAS URL). No username/password in the frontend.

3. **Deploy**  
   - VAS server: deploy to Azure / Railway / Render / Fly.io (or existing host) and set `GETBUCKS_*` env vars there.  
   - H5 apps on Vercel: set only `VITE_TOKEN_API_BASE_URL` and `VITE_VAS_API_BASE_URL` (or a single base URL that serves both token and BankWare proxy).

This way you can safely host the H5 apps on **Vercel** and keep BankWare credentials only on the **backend**.

---

## Option B: Frontend-Only (Dev / Internal Only)

- Use `VITE_GETBUCKS_*` only in **local or internal** builds (e.g. dev, or a build that is never publicly deployed).
- **Do not** use these env vars for any build deployed to a **public** URL (e.g. `h5-getbucks-airtime.vercel.app`).
- Accept that anyone with access to that public build could extract credentials if you ever accidentally expose them.

For production, Option A is the right way forward.

---

## Checklist

- [ ] Rotate BankWare password if it was ever in repo or frontend env.
- [ ] Add BankWare proxy endpoints to VAS server (token + account-transfers).
- [ ] Store `GETBUCKS_*` only in **server** env on the host running the VAS server.
- [ ] Update H5 apps to call VAS proxy instead of BankWare directly; use only `VITE_VAS_API_BASE_URL` (or similar) in frontend.
- [ ] Host H5 apps on Vercel with **no** `VITE_GETBUCKS_USERNAME` / `VITE_GETBUCKS_PASSWORD`.
- [ ] Deploy VAS server (with proxy) to Azure / Railway / Render / Fly.io and configure env there.
- [ ] Point production H5 apps to the production VAS URL for token and BankWare proxy.

---

## Summary

- **You need these details to make transfers**, but they must live **only on the server**, not in the browser.
- **Host the H5 apps on Vercel**; host the **VAS server (with a BankWare proxy)** somewhere that supports server-side env (Azure, Railway, etc.).
- **Do not** put `VITE_GETBUCKS_USERNAME` or `VITE_GETBUCKS_PASSWORD` on Vercel or in any frontend build that is publicly accessible.
