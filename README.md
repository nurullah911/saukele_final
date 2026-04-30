# Saukele Backend — Sprint 1

Express.js + Prisma + PostgreSQL backend for the Saukele wedding registry platform.

## What is implemented (Sprint 1 — ~30% of final project)

### Auth subsystem (100% complete)
- `POST /api/auth/register` — registration with Zod validation, bcrypt hashing (12 rounds), role restricted to COUPLE/GUEST
- `POST /api/auth/login` — credential verification, issues JWT access token (15min) + refresh token (7d)
- `POST /api/auth/refresh` — exchanges valid refresh token for new access token
- `POST /api/auth/logout` — revokes refresh token (SHA-256 hash stored in DB)
- RBAC middleware: wrong role → 403 Forbidden (not 401)
- Rate limiting: 5 attempts / 15min per IP+email on auth routes
- CORS: whitelist from FRONTEND_URL env var, no wildcard in production

### Core business logic
- Registry CRUD (create, list, publish, public share token view)
- Gift management (add SINGLE/POOL gift, reserve with 48hr expiry, get with funding progress)
- Pool funding contribution with currency snapshot (amount_kzt, amount_original, exchange_rate_at_time, locked_at — never updated)
- Kaspi Pay webhook with HMAC-SHA256 signature validation
- Kinship tier system (ATA_ANA/TUYS/ZHIEN_ZHARAN/DOSY) with full CRUD
- Recursive CTE family tree endpoint — `GET /api/kinship/tree/:coupleId`
- Admin user listing

### Track-specific complexity requirements (Saukele)
1. **Self-referential table** — `family_relations` with `from_user_id`/`to_user_id`
2. **Recursive CTE query** — `GET /api/kinship/tree/:coupleId` uses `WITH RECURSIVE`
3. **Pool funding escrow state machine** — PENDING → FUNDED → (gift) PURCHASED
4. **Currency snapshot** — `exchange_rate_at_time` + `locked_at` stored at creation, never mutated
5. **Overfunding prevention** — atomic transaction checks total committed amount before inserting

## Run with Docker (one command)

```bash
docker compose up --build
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Health: http://localhost:3000/health

## Local development

```bash
npm install
npx prisma generate
# copy .env.example to .env and fill in values
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

## Run tests

Unit tests (no database needed):
```bash
npm test -- tests/unit
```

Integration tests (requires PostgreSQL at .env.test DATABASE_URL):
```bash
npm test -- tests/integration
```

All tests:
```bash
npm test
```

## Postman — Defense Flow

Import `Saukele.postman_collection.json`. Run tabs in this order:

1. **Auth → Register Couple** → **Register Guest**
2. **Auth → Login Couple** (auto-saves `coupleToken` + `refreshToken` variable)
3. **Auth → Login Guest** (auto-saves `guestToken`)
4. **Auth → Refresh Token** — show token rotation
5. **Auth → 403 — Guest tries Couple route** — show RBAC working
6. **Registry → Create Registry** (auto-saves `registryId`, `shareToken`, `coupleId`)
7. **Gifts → Add SINGLE Gift** → **Add POOL Gift**
8. **Registry → Publish Registry** (requires at least 1 gift)
9. **Registry → Public View by Share Token** (no auth)
10. **Gifts → Reserve SINGLE Gift** (as guest)
11. **Contributions → Contribute to POOL Gift — EUR** (currency snapshot)
12. **Kinship → Set Kinship** → **Family Tree — Recursive CTE**
13. **Auth → Logout** — show token revocation

## Architecture decisions

- **Prisma ORM** — zero raw SQL except the recursive CTE which PostgreSQL requires (`WITH RECURSIVE`) and is called via `prisma.$queryRaw` with tagged template literals (parameterized, SQL-injection safe)
- **bcryptjs** — 12 salt rounds; passwords never returned in API responses (Prisma select whitelist)
- **JWT** — HS512 algorithm, separate secrets for access and refresh; refresh tokens stored as SHA-256 hashes
- **Snapshot pattern** — exchange rates locked at contribution time via `locked_at` timestamp; historical rows are never updated
- **State machine** — gift status: AVAILABLE → RESERVED → PURCHASED → DELIVERED; contribution status: PENDING → FUNDED / REFUNDED
