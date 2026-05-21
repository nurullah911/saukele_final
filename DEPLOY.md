# Deployment

Saukele is deployment-provider-agnostic. The backend reads environment variables, listens on `0.0.0.0:$PORT`, and the static frontend defaults to same-domain `/api`.

## Required Environment Variables

Backend:

- `DATABASE_URL` - PostgreSQL connection string.
- `REDIS_URL` - preferred Redis connection string.
- `REDIS_HOST` - fallback Redis host when `REDIS_URL` is not set.
- `REDIS_PORT` - fallback Redis port when `REDIS_URL` is not set.
- `JWT_SECRET` - 64+ character access token secret.
- `REFRESH_SECRET` - 64+ character refresh token secret.
- `PAYMENT_WEBHOOK_SECRET` - payment webhook signing secret.
- `BREVO_API_KEY` - Brevo SMTP API key.
- `EMAIL_FROM` - Brevo verified sender address/domain.
- `FRONTEND_URL` - public frontend URL, used in email links and CORS.
- `NODE_ENV` - `development`, `test`, or `production`.
- `PORT` - backend port supplied by the platform, defaults to `3000`.

Frontend:

- `API_URL` - optional runtime API base URL. Leave empty for same-domain `/api`; set to `https://backend.example.com/api` for separate services.

## Local Docker Compose

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Set real values for `JWT_SECRET`, `REFRESH_SECRET`, `PAYMENT_WEBHOOK_SECRET`, and optionally Brevo values. Local Docker Compose already uses:

   ```env
   DATABASE_URL=postgresql://saukele:saukele_password@postgres:5432/saukele?schema=public
   REDIS_URL=redis://redis:6379
   FRONTEND_URL=http://localhost
   API_URL=
   ```

3. Start the stack:

   ```bash
   docker compose up --build
   ```

4. Open:

   - Frontend: `http://localhost`
   - Backend health: `http://localhost:3000/health`
   - Frontend health: `http://localhost/healthz`
   - Swagger: `http://localhost:3000/docs`

5. Register in the frontend. In development without `BREVO_API_KEY`, the backend logs the verification link and raw token. Paste the token into the verification screen, then log in.

## Same-Domain Docker / DeployRocks / Dokku Mode

Use the frontend container as the public entrypoint. The frontend calls `/api`, and nginx proxies `/api/` to the backend service named `api` on port `3000`.

Set backend variables for the public deployment:

```env
NODE_ENV=production
FRONTEND_URL=https://frontend.example.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
REFRESH_SECRET=...
PAYMENT_WEBHOOK_SECRET=...
BREVO_API_KEY=...
EMAIL_FROM=noreply@example.com
```

Leave frontend `API_URL` empty so `window.__API_URL__` falls back to `/api`.

## Separate-Service Railway / Render Mode

Deploy backend and frontend as separate services.

Backend variables:

```env
NODE_ENV=production
PORT=<platform-provided-port>
FRONTEND_URL=https://frontend.example.com
DATABASE_URL=<provider-postgres-url>
REDIS_URL=<provider-redis-url>
JWT_SECRET=<64+ chars>
REFRESH_SECRET=<64+ chars>
PAYMENT_WEBHOOK_SECRET=<secret>
BREVO_API_KEY=<brevo-key>
EMAIL_FROM=<brevo-verified-sender>
```

Frontend variable:

```env
API_URL=https://backend.example.com/api
```

The frontend container writes `/config.js` at startup:

```js
window.__API_URL__ = "https://backend.example.com/api";
```

If `API_URL` is empty, the app uses `/api`.

## Manual Smoke Checks

```bash
npm install
npx prisma generate
npm test
docker compose up --build
```

Then check:

- `GET http://localhost:3000/health` returns `{ "status": "ok" }`.
- `http://localhost/healthz` returns `ok`.
- Registration switches to the email verification screen.
- Verification link opens `/verify-email?token=...`.
- Reset link opens `/reset-password?token=...`.
- Admin can suspend, unsuspend, and delete users.

Brevo must have `EMAIL_FROM` verified before production emails will be accepted.
