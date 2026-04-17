# Oddzilla

B2C esports sportsbook MVP. Minimalist dark UI with live odds from Oddin.gg, real-time bet placement, automated settlement, and an admin dashboard.

## Features

- **Live Odds**: Real-time odds feed via RabbitMQ (AMQP), with mock producer for development
- **Bet Placement**: Single and parlay bets with same-market restriction, BullMQ delayed acceptance, price tolerance checks
- **Settlement**: Automated `bet_settlement` and `bet_cancel` handling from feed, stake refunds on void
- **Wallets**: Admin-credit-only USDT wallets, locked balance on pending bets, automated payouts
- **Admin Panel**: PnL dashboard, settings editor (payback margin, bet delay, global limit), user management
- **Auth**: JWT access/refresh rotation with httpOnly cookies, Argon2id password hashing
- **Real-time UI**: Socket.IO with JWT handshake auth, Redis pub/sub for odds deltas
- **Rate Limiting**: `@nestjs/throttler` on auth and betting endpoints
- **Testing**: Vitest API integration tests, Playwright E2E tests
- **CI/CD**: GitHub Actions pipeline, production Dockerfiles

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 15 App Router, React 18, Tailwind CSS, Lucide icons
- **Backend**: NestJS 10, Passport JWT, BullMQ, Pino logs, Helmet
- **Database**: PostgreSQL 16 via Prisma 5
- **Cache / pub-sub**: Redis 7
- **Message broker**: RabbitMQ 3.13
- **Node 20 LTS**, pnpm 10+

## Repo layout

```
apps/
  api/                NestJS API (auth, betting, settlement, admin, wallet, feed, realtime)
  web/                Next.js web (live matches, bet slip, history, admin panel)
  e2e/                Playwright E2E tests
packages/
  db/                 Prisma schema, generated client, seed
  shared/             Zod DTOs and enums shared across apps
infra/
  docker-compose.yml       Postgres + Redis + RabbitMQ (dev)
  docker-compose.prod.yml  Full stack including api + web (production)
docs/
  PROMPT_GUIDE.md     Master prompt and prompting framework
  DEPLOY.md           Production deployment runbook
.github/
  workflows/ci.yml    CI pipeline
```

## Prerequisites

- Node 20 or 22 (`.nvmrc` pins 20)
- pnpm 10 (`corepack enable` then `corepack prepare pnpm@10.32.1 --activate`)
- Docker Desktop or compatible (`docker compose` v2+)

## Quick start

```bash
cp .env.example .env
# Edit .env — generate JWT secrets: openssl rand -hex 32

pnpm infra:up        # Postgres, Redis, RabbitMQ via Docker

pnpm install

pnpm db:migrate
pnpm db:seed

pnpm dev
```

Services after `pnpm dev` (default ports):

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001/api](http://localhost:3001/api)
- Health: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- Postgres: `localhost:5432` (user/db `oddzilla`)
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672`, management UI on `localhost:15672`

All ports are configurable via `.env` — see **Collaboration** below.

## Common scripts

| Script | Description |
|---|---|
| `pnpm dev` | Build shared packages, run API + web in parallel with hot reload |
| `pnpm build:packages` | Compile `@oddzilla/shared` and `@oddzilla/db` |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run Vitest API integration tests |
| `pnpm e2e` | Run Playwright E2E tests |
| `pnpm infra:up` / `pnpm infra:down` | Manage Docker dev services |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed sports, categories, producers, admin user |
| `pnpm db:studio` | Open Prisma Studio |

## Authentication

- `POST /api/auth/signup` -- creates user, returns access token, sets refresh cookie
- `POST /api/auth/login` -- returns access token, sets httpOnly refresh cookie
- `POST /api/auth/refresh` -- rotates refresh token family via cookie
- `POST /api/auth/logout` -- revokes refresh family, clears cookie
- `GET /api/auth/me` -- current profile (requires `Authorization: Bearer`)

Rate-limited: signup 5/min, login 10/min.

## Betting API

- `POST /api/betting/tickets` -- place a bet (rate-limited 30/min)
- `GET /api/betting/tickets` -- list user tickets (paginated)
- `GET /api/betting/tickets/:id` -- get ticket detail

## Admin API

All admin routes require `role=admin`.

- `GET /api/admin/settings` / `PATCH /api/admin/settings/:key`
- `GET /api/admin/users` / `PATCH /api/admin/users/:id`
- `POST /api/admin/users/:id/credit`
- `GET /api/admin/pnl`

## Testing

```bash
# API integration tests (requires running Postgres/Redis/RabbitMQ)
pnpm test

# E2E tests (starts dev server automatically)
pnpm e2e
```

## Production Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for the full runbook using `docker-compose.prod.yml`.

## Not in scope

- On-chain USDT payments (wallets are admin-credit-only)
- KYC / age verification
- News/content section
- Multi-language support

## Collaboration

### Git workflow

- **`main`** — stable, CI-passing, protected. Never push directly.
- **`feat/*`** or **`<name>/*`** — feature branches (e.g. `alex/live-parlays`, `sasha/admin-charts`).
- Open a **Pull Request** into `main`. CI runs automatically on every PR.
- Merge after review and green CI.

```bash
git checkout -b feat/my-feature
# ... work ...
git push -u origin HEAD
gh pr create --title "Add my feature"
```

### Running multiple instances on the same server

If two or more developers share a machine (e.g. a remote dev server), each must use **different ports** and a **separate Docker Compose project name** to avoid collisions.

1. Clone the repo into a separate directory per developer.
2. Copy `.env.example` to `.env` and adjust the values below.

| Variable | Dev 1 (default) | Dev 2 | Dev 3 |
|---|---|---|---|
| `COMPOSE_PROJECT_NAME` | `oddzilla` | `oddzilla-sasha` | `oddzilla-dev3` |
| `WEB_PORT` | 3000 | 4000 | 5000 |
| `API_PORT` | 3001 | 4001 | 5001 |
| `POSTGRES_PORT` | 5432 | 5433 | 5434 |
| `REDIS_PORT` | 6379 | 6380 | 6381 |
| `RABBITMQ_PORT` | 5672 | 5673 | 5674 |
| `RABBITMQ_MGMT_PORT` | 15672 | 15673 | 15674 |

When changing ports, also update these derived variables to match:

```
DATABASE_URL=postgresql://oddzilla:oddzilla@localhost:<POSTGRES_PORT>/oddzilla?schema=public
REDIS_URL=redis://localhost:<REDIS_PORT>
RABBITMQ_URL=amqp://oddzilla:oddzilla@localhost:<RABBITMQ_PORT>
WEB_ORIGIN=http://localhost:<WEB_PORT>
NEXT_PUBLIC_API_URL=http://localhost:<API_PORT>
```

Then run `pnpm infra:up && pnpm dev` as usual. Each instance gets its own Docker containers, volumes, and database.

### Running locally (single developer)

No changes needed — the defaults in `.env.example` work out of the box. Each developer on their own machine just runs the standard quick start.

## Architecture

```mermaid
flowchart LR
  Browser --> WebApp["Next.js 15 (App Router)"]
  WebApp -->|REST| Api[NestJS API]
  WebApp <-->|Socket.IO| Api
  Api --> Postgres[(PostgreSQL 16)]
  Api --> Redis[(Redis 7)]
  Api --> BullMQ[BullMQ bet delay]
  Api --> Rabbit[(RabbitMQ 3.13)]
  Rabbit -->|odds_change| FeedConsumer
  Rabbit -->|bet_settlement| FeedConsumer
  Rabbit -->|bet_cancel| FeedConsumer
  FeedConsumer --> Api
```
