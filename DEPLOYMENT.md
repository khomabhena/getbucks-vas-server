# Deployment Guide (VM + Docker)

This mirrors the Redboxx VM flow and deploys to the same VM with a different path/port.

## 1) GitHub repo secrets
Set these in **Repo → Settings → Secrets and variables → Actions**:
- `VM_HOST` = VM public IP
- `VM_USER` = `adminuser`
- `VM_SSH_KEY` = private key contents (`.pem`)
- `VM_ENV_PATH` = `/home/adminuser/vas/getbucks-vas-server/.env`
- `GHCR_TOKEN` = PAT with `read:packages` (+ `repo` if private)

## 2) VM one-time setup
SSH in:
```
ssh -i .\h5-qa-env-key.pem adminuser@4.222.185.132
```

Ensure repo path exists:
```
sudo mkdir -p /home/adminuser/vas/getbucks-vas-server
sudo chown -R adminuser:adminuser /home/adminuser/vas/getbucks-vas-server
```

Give docker permissions:
```
sudo usermod -aG docker adminuser
exit
# re-SSH to apply
```

Create `.env` on the VM:
```
nano /home/adminuser/vas/getbucks-vas-server/.env
```

Example `.env`:
```
PORT=3001
IBANK_CLIENT_ID=ibank-vas-h5-prod
IBANK_CLIENT_SECRET=ibank-vas-h5-prod-...
JWT_SECRET=your-secret-key-min-32-chars
AIRTIME_APP_URL=https://h5-getbucks-airtime.vercel.app
BILL_PAYMENTS_APP_URL=https://h5-getbucks-bill-payments.vercel.app
TOKEN_EXPIRES_IN=25m
TOKEN_EXPIRES_IN_SECONDS=1500
```

## 3) Nginx route (same VM)
Add a new location in your existing nginx config:
```
location /vas/ {
  proxy_pass http://127.0.0.1:3001/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
}
```

Reload nginx:
```
sudo nginx -t
sudo systemctl reload nginx
```

## 4) Trigger deploy
Push to `main`:
```
git add .
git commit -m "Deploy"
git push origin main
```

GitHub Actions will:
- Build and push Docker image to GHCR
- SSH into the VM
- Pull the latest image
- Restart the container on port 3001

## 5) Verify
Health:
```
https://4.222.185.132.nip.io/vas/
```

Token endpoints:
- `POST https://4.222.185.132.nip.io/vas/api/token/request`
- `GET https://4.222.185.132.nip.io/vas/api/validate-token`

