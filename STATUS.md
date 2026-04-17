# Status

Phase 1 scaffold delivered per the plan at `.cursor/plans/oddzilla-phase-1-scaffold_*.plan.md` and `docs/PROMPT_GUIDE.md`.
Phase 2a (live odds read side) delivered per `.cursor/plans/oddzilla-phase-2a-live-odds_*.plan.md`.
Phase 2b (betting, settlement, admin, auth hardening) delivered per `.cursor/plans/oddzilla_phase_2b_*.plan.md`.
Phase 3 (production hardening, testing, CI, deploy) delivered per `.cursor/plans/oddzilla_phase_3_*.plan.md`.

## What's done

### Phase 1

- pnpm monorepo: `apps/api`, `apps/web`, `packages/db`, `packages/shared`.
- Docker Compose with Postgres 16, Redis 7, RabbitMQ 3.13 (healthchecks, named volumes).
- Prisma schema covering User, Wallet, Transaction, RefreshToken, Sport, Category, Tournament, Match, Market, Outcome, Ticket, TicketSelection, Producer, FeedMessage, RecoverySession, SettlementEvent, AdminSetting, AuditLog.
- Seed script: 4 sports, 4 synthetic categories, 2 Oddin producer placeholders, default admin settings, env-seeded admin user with `mustChangePassword=true`.
- NestJS API: ConfigModule (Zod-validated env), PrismaModule, RedisModule, AuditModule, LoggerModule (Pino + request-id), HealthModule, AuthModule (Argon2id + JWT access/refresh rotation), UsersModule.
- Next.js 15 web app: dark tokens, Geist fonts, Lucide icons, app shell, routes `/`, `/signup`, `/login`, `/history`, `/news`, `/admin`; signup/login wired to API via `@oddzilla/shared` schemas.

### Phase 2a — Live Odds Read Side

- **Mock Oddin producer** (`apps/api/src/feed/mock/`): 4 synthetic matches (CS2, Dota 2, LoL, Valorant), Oddin-shaped `odds_change` XML published to RabbitMQ every 2s with random price drift. 5% chance of temporary market suspension (2-tick duration). Gated by `ENABLE_MOCK_FEED=true`.
- **Feed consumer** (`apps/api/src/feed/`): AMQP consumer on topic exchange `unifiedfeed.integration`, parses XML with `fast-xml-parser`, writes raw `FeedMessage` for auditability, projects `odds_change` into Match/Market/Outcome hierarchy via upserts.
- **Pricing pipeline**: reads `default_payback_margin` from AdminSetting (cached 10s), computes multi-outcome overround normalization, writes to Outcome, publishes delta to Redis pub/sub channel `match:<id>`.
- **Socket.IO realtime gateway** (`apps/api/src/realtime/`): subscribed to Redis `match:*` pattern, per-match rooms with `subscribe`/`unsubscribe` events.
- **Matches REST API**: `GET /api/sports`, `GET /api/matches?status=live|scheduled`, `GET /api/matches/:id`.
- **Live matches list and match detail page** with live-updating odds cells (yellow flash on up, gray on down).

### Phase 2b — Betting, Settlement, Admin, Auth Hardening

- **httpOnly refresh cookie**: Refresh token stored in httpOnly SameSite=Lax cookie. Web client uses `credentials: 'include'`.
- **WalletModule**: `getBalance`, `creditAdmin`, `lockStake`, `unlockStake`, `deductStake`, `payout` — all inside Prisma transactions.
- **BettingModule**: Ticket placement with price validation (5% tolerance), global limit enforcement, bet delay, lock/deduct cycle.
- **SettlementModule**: Processes `bet_settlement` XML messages. Settles markets, resolves ticket outcomes, pays out wallets.
- **AdminModule**: Settings CRUD, user management, PnL summary, wallet credit. All routes require admin role.
- **Bet slip UI**: Floating panel with selections, stake input, potential payout.
- **Bet history page** and **admin panel** with tabbed interface.

### Phase 3 — Production Hardening, Testing, CI, Deploy

- **BullMQ bet delay**: Replaced `setTimeout` with a BullMQ delayed job queue. `bet-delay` queue backed by Redis. `BetDelayProcessor` worker processes accept/reject jobs. Bet delay of 0 still runs synchronously.
- **bet_cancel handling**: `BetCancelMsg` interface and `parseBetCancel()` in xml-parser. `cancelMarket()` in SettlementService voids all outcomes, sets market status to `cancelled`, and refunds affected tickets. Feed consumer wires `bet_cancel` message type. Mock producer emits a `bet_cancel` for one market ~45s after startup.
- **Same-market parlay restriction**: Server-side validation in `BettingService.placeTicket()` rejects multiple outcomes from the same market. Client-side `useBetSlip` implements swap behavior (selecting a new outcome from the same market replaces the old one). `marketId` added to `BetSlipSelection` interface and passed through from all UI components.
- **Socket.IO JWT auth**: Gateway verifies JWT from `client.handshake.auth.token` on connection. Tags `client.data.authenticated`, `client.data.userId`, `client.data.role`. Invalid/missing tokens allow connection for public reads. Web client passes access token via `auth` option.
- **Rate limiting**: `@nestjs/throttler` with 20/min global default. Auth: signup 5/min, login 10/min. Betting: placeTicket 30/min.
- **Vitest API tests**: Integration test suite in `apps/api/test/` with shared setup (NestJS testing module, Prisma, helper functions). Test suites: auth (signup, login, refresh, me, logout, duplicate), betting (unauthenticated, empty, list, nonexistent outcome), wallet (balance, admin-credit guard), admin (settings/users/pnl guard checks).
- **Playwright E2E tests**: New `apps/e2e` workspace. Specs: smoke (home page, navigation, health endpoint), auth (signup, login, unauthenticated redirect), betting (matches visible, odds click, match detail).
- **GitHub Actions CI**: `.github/workflows/ci.yml` with postgres/redis/rabbitmq service containers. Steps: checkout, pnpm install, build packages, typecheck, lint, db migrate, db seed, Vitest API tests, Playwright E2E. Artifact upload for Playwright traces on failure.
- **Production Dockerfiles**: Multi-stage `apps/api/Dockerfile` (deps → build → runner) and `apps/web/Dockerfile` (standalone Next.js output). `infra/docker-compose.prod.yml` with all services. Next.js config updated with `output: 'standalone'`.
- **Deploy runbook**: `docs/DEPLOY.md` with build, migration, seed, verify, rollback, and log instructions.
- **README rewrite**: Full feature description, architecture diagram with BullMQ and feed message types, API reference, testing and deploy sections.

## Assumptions

- **pnpm 10 / Node 20** pinned via `.nvmrc` and `engines.node`.
- **Accent colour** `#E5FF3F` (bright chartreuse) as placeholder.
- **Producer IDs** (`1` = live, `3` = prematch) are placeholders until Oddin credentials arrive.
- **Refresh token** stored as httpOnly cookie. No sessionStorage.
- **Passwords** hashed with Argon2id default params.
- **CORS** set to `WEB_ORIGIN` from env.
- **Shared packages** built to `dist/` and consumed via node_modules resolution.

## Not in scope

- On-chain USDT payments (wallets are admin-credit-only)
- KYC / age verification
- News/content section
- Multi-language support
- Oddin production credentials (mock feed covers development)
