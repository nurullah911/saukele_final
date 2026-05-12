# Saukele Backend — Final Project

Express.js + Prisma + PostgreSQL + Redis backend for the Saukele wedding registry platform supporting Kazakh traditions.

## Run with Docker (one command)

```bash
docker compose up --build
```

- API: http://localhost:3000
- Swagger UI: http://localhost:3000/docs
- Health: http://localhost:3000/health

## What is implemented

### Auth (100% complete)
- Registration with Zod validation, bcrypt hashing (12 rounds)
- Login — issues JWT access token (15min) + refresh token (7d)
- Refresh with **token rotation** — old token deleted, new pair issued
- Logout — revokes refresh token from DB
- RBAC middleware: wrong role → 403 Forbidden (not 401)
- Rate limiting: 5 attempts / 15min per IP+email on auth routes
- CORS: whitelist from FRONTEND_URL env var

### Business Logic (Saukele track — all 6 requirements)

**1. Kinship Logic**
Family tree built via Prisma ORM — tiers (ата-ана, туыс, жиен-жаран, досы) with suggested contribution amounts. Endpoint `GET /api/kinship/tree/:coupleId` returns full tree grouped by tier.

**2. Pool Funding**
Contribution state machine: PENDING → FUNDED → (gift) PURCHASED. Overfunding prevention via atomic `prisma.$transaction()`. `GET /api/gifts/:id` returns `totalFunded` and `remaining`.

**3. Multi-currency Snapshots**
`exchangeRateAtTime` + `lockedAt` stored at contribution creation time — never updated (Snapshot Pattern). Supports KZT, USD, EUR.

**4. Logistics Orchestration**
Choco and inDriver couriers. Business rules: fragile items require white glove, white glove only via CHOCO. Status flow: PENDING → ASSIGNED → IN_TRANSIT → DELIVERED.

**5. Privacy Tiers**
`isPrivate` field on gifts. Private gifts visible only to guests with tier 1-2 (ATA_ANA, TUYS). Guests tier 3-4 or without kinship get 403.

**6. Notification Etiquette**
Notifications suppressed during құттықтау period (3 days before to 7 days after wedding) and outside polite hours (9:00-20:00). Endpoint `GET /api/notifications/etiquette` shows current status.

### Admin Panel
Full CRUD for users (list, get, suspend, delete), registries (list, close, delete) and contributions (list, flag for dispute).

### Infrastructure
- PostgreSQL 15 with ACID transactions
- Redis 7 for rate limiting
- Docker Compose with health checks
- CI/CD via GitHub Actions (unit + integration + docker build)
- Swagger UI at `/docs`
- 28 unit tests + integration tests

## Local development

```bash
cp .env.example .env
# Fill in .env values
npm install
npx prisma migrate dev
npm run dev
```

## Run tests

```bash
# Unit tests (no DB needed)
npx jest tests/unit

# Integration tests (requires DB)
npx jest tests/integration
```

## Create Admin user

```bash
# 1. Register as GUEST
# 2. Promote via DB:
docker exec -it saukele-postgres psql -U saukele -d saukele -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

## Architecture decisions

- **Layered architecture**: Router → Controller → Service → Prisma ORM
- **Zero raw SQL**: all DB interactions through Prisma ORM including family tree (application-layer traversal)
- **Snapshot Pattern**: exchange rates locked at contribution time, never mutated
- **State Machine**: Gift (AVAILABLE→RESERVED→PURCHASED→DELIVERED), Contribution (PENDING→FUNDED/REFUNDED)
- **HMAC-SHA256** webhook signature validation before processing payment callbacks
- **Token Rotation**: refresh returns new pair, old token deleted immediately
