# Saukele — Wedding Registry Platform

Full-stack wedding registry application for Kazakh traditions. Backend: Express.js + Prisma + PostgreSQL + Redis + BullMQ. Frontend: Vanilla HTML/JS.

## Live URL

See `DEPLOYED_URL.txt`

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env and add your BREVO_API_KEY
docker compose up --build
```

- Frontend: http://localhost
- API: http://localhost:3000
- Swagger: http://localhost:3000/docs

## Local Development

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Run Tests

```bash
npm test
# or just unit tests (no DB needed):
npx jest tests/unit
```

## Architecture

### Tech Stack
- **Backend**: Express.js (Node.js)
- **ORM**: Prisma (zero raw SQL)
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7 + BullMQ
- **Email**: Brevo via REST API (native fetch)
- **Auth**: JWT (access 15min + refresh 7d with rotation)
- **Frontend**: Vanilla HTML/JS served via nginx

### Layers
```
Router → Controller → Service → Prisma ORM → PostgreSQL
                              ↘ BullMQ Queue → EmailWorker → Brevo
```

### Key Design Decisions

**Snapshot Pattern** — exchange rates locked at contribution time (`exchangeRateAtTime`), never updated. Historical rows are immutable.

**State Machine** — Gift: AVAILABLE → RESERVED → PURCHASED → DELIVERED. Contribution: PENDING → FUNDED → REFUNDED.

**Privacy Tiers** — `isPrivate` gifts visible only to kinship tier 1-2 (ATA_ANA, TUYS). Application-level enforcement in giftService.

**Email Queue** — All emails sent asynchronously via BullMQ. API never blocks on email delivery. Worker handles retries.

**Token Rotation** — On refresh, old token deleted, new pair issued.

## Saukele Track Requirements

| Requirement | Implementation |
|---|---|
| Kinship Logic | `GET /api/kinship/tree/:coupleId` — family tree grouped by tier |
| Pool Funding | Escrow state machine, overfunding prevention via transaction |
| Multi-currency Snapshots | `exchangeRateAtTime` + `lockedAt` — immutable |
| Logistics Orchestration | Choco (white glove) / inDriver, fragile item rules |
| Privacy Tiers | `isPrivate` field, tier check in `canViewPrivateGift()` |
| Notification Etiquette | Suppressed during құттықтау (3d before — 7d after wedding) |

## Environment Variables

See `.env.example` for all required variables.

Key variables:
- `BREVO_API_KEY` — get from brevo.com (free tier available)
- `EMAIL_FROM` — your verified sender email
- `JWT_SECRET` — must be 64+ characters
- `REFRESH_SECRET` — must be 64+ characters

## Create Admin User

```bash
# 1. Register as GUEST via API or frontend
# 2. Promote via DB:
docker exec -it saukele-postgres psql -U saukele -d saukele \
  -c "UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';"
```

## Background Workers

BullMQ worker (`src/workers/emailWorker.js`) processes:
- `verification` — email verification on signup
- `passwordReset` — password reset link
- `giftReserved` — notify couple when guest reserves gift
- `registryPublished` — notify couple when registry goes live
- `contribution` — notify couple of new pool contribution
