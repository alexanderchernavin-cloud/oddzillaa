# Community Features — Implementation Plan

Owner: Alex Cartier (@Arak00)
Status: Proposed — open for review
Target: post-Phase 3 sprint after current production hardening lands

This plan lays out a four-sprint path to a usable Community surface
in Oddzilla — public profiles, a feed of recently-settled bets,
copy-to-bet, achievements, and AI seed bettors. It draws on lessons
from the Corwyn community-signals build, applied to Oddzilla's
single-tenant esports B2C shape.

---

## Why this scope

Oddzilla is structurally simpler than the Corwyn equivalent:

- Single tenant — no operator hierarchy, no global-community fan-out.
- Esports-only (CS2, Dota 2, LoL, Valorant) — small, contained universe.
- Single Next.js + NestJS app — no iframe boundary, no cross-codebase
  token alignment.
- Real USDT settlement — actual ROI, not a proxy XP score.

That removes about 60% of the complexity of the equivalent feature on
Corwyn. The plan reflects this: smaller schema, no SurrealDB, no
denormalized read tier beyond a single Postgres projection table.

The V1 scope deliberately drops the **social graph** (follow, People
tab, follower counts). Discovery is achievement-driven and feed-driven.
Reason: in Corwyn we found the social-graph surface costs more in
moderation and abuse vectors than it returns in retention, especially
before we have meaningful network density.

---

## Decisions locked

| # | Decision | Rationale |
|---|---|---|
| D1 | `User.ticketsPublic` defaults to `true` on signup | Maximizes feed density from day one. Toggle is a one-click opt-out in `/settings/community`. |
| D2 | `User.isAi` flag exists in DB, never exposed in UI | Transparency-on-request for regulators / future audit, but seed bettors must read as normal users in feed. Matches Corwyn "no editorial badges" rule. |
| D3 | Real-money leaderboards are in scope | Showing biggest USDT win this week is fine for Oddzilla's USDT-wallet model. Documented and approved. |

---

## V1 surface

1. **Public profile** — `/u/[displayName]`: handle, ROI, win rate,
   badge count, last 10 settled tickets.
2. **Community feed** — `/community`: two tabs (Recent, Best Wins),
   sport filter, last-7-days window, one-click Copy this bet.
3. **Visibility settings** — `/settings/community`: tickets public
   toggle, optional nickname, 280-char bio.
4. **Achievements** — five starter badges, settlement-driven, idempotent
   unlock writes.
5. **AI seed bettors** — internal accounts (`User.role = seed`,
   `User.isAi = true`) generating plausible tickets via the existing
   `BettingService` path. Drives early-day feed density.

Out of V1: comments, reactions, follow, chat, stories, video clips.
Revisit when feed engagement justifies the moderation cost.

---

## Schema additions

Three new tables, two enum extensions, no rewrites of existing tables.

```prisma
// User additions
enum UserRole {
  user
  admin
  seed   // NEW: AI-generated bettor account
}

model User {
  // ... existing fields ...
  ticketsPublic Boolean @default(true)   // NEW
  nickname      String? @unique          // NEW, public-facing handle override
  bio           String?                   // NEW, max 280 chars (validated at API layer)
  isAi          Boolean @default(false)  // NEW, never exposed in API responses
}

// Read-projection of Ticket, written from SettlementService.resolveTicket
model CommunityTicket {
  id         String       @id @default(uuid()) @db.Uuid
  ticketId   String       @unique @db.Uuid
  userId     String       @db.Uuid
  stakeUsdt  Decimal      @db.Decimal(24, 8)
  payoutUsdt Decimal      @db.Decimal(24, 8)
  totalOdds  Decimal      @db.Decimal(24, 8)
  numLegs    Int
  status     TicketStatus
  sportIds   String[]
  settledAt  DateTime
  score      Float        @default(0)
  createdAt  DateTime     @default(now())

  ticket Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([settledAt(sort: Desc)])
  @@index([score(sort: Desc), settledAt(sort: Desc)])
  @@index([userId, settledAt(sort: Desc)])
}

model AchievementDefinition {
  id          String   @id    // "first_win", "five_leg_parlay", etc.
  title       String
  description String
  icon        String         // lucide icon name
  createdAt   DateTime @default(now())
}

model UserAchievement {
  id            String                @id @default(uuid()) @db.Uuid
  userId        String                @db.Uuid
  achievementId String
  unlockedAt    DateTime              @default(now())

  user        User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement AchievementDefinition @relation(fields: [achievementId], references: [id])

  @@unique([userId, achievementId])
  @@index([userId])
}
```

`CommunityTicket` is a projection, not a replacement. We write it from
a single hook in `SettlementService.resolveTicket()`, right next to the
existing `redis.publish('ticket:...')` call. Same shape as the Corwyn
activity-history Kafka consumer — but in-process here because we're
single-service.

---

## API surface

Conventional NestJS module under `apps/api/src/community/`. Public
reads use the existing `JwtAuthGuard` with optional auth; mutations
require auth.

```
GET    /api/community/feed?sort=recent|best&sportId=&page=&pageSize=
GET    /api/community/users/:displayName/profile
GET    /api/community/users/:displayName/tickets?page=&pageSize=
GET    /api/community/me/achievements                                 (auth)
PATCH  /api/community/me/visibility   body: { ticketsPublic: bool }   (auth)
PATCH  /api/community/me/profile      body: { nickname?, bio? }       (auth)
POST   /api/community/copy/:communityTicketId                         (auth)
       → returns prefilled bet-slip selections
```

DTOs go in `packages/shared/src/community.ts`. Field names are locked
on first commit and never renamed (Corwyn QA found ~6 schema-naming
drifts that broke FE; we avoid the same trap).

```ts
export const communityTicketDto = z.object({
  id: z.string().uuid(),
  author: z.object({                     // ALWAYS hydrated, never optional
    displayName: z.string(),
    nickname: z.string().nullable(),
    winRate: z.number().min(0).max(1),
    badgeCount: z.number().int(),
  }),
  stakeUsdt: z.number(),
  payoutUsdt: z.number(),
  totalOdds: z.number(),
  status: z.enum(['won', 'lost', 'void']),
  selections: z.array(/* ... */),
  settledAt: z.string().datetime(),
  score: z.number(),
});
```

The `User.isAi` field is filtered out of every API response by default.
There is no `?showAi=true` parameter — the only way to see AI status is
direct DB query (admin-only).

### Realtime

Add `community:feed` channel. `SettlementService` publishes
`{ type: 'ticket.settled', communityTicket: {...} }` after creating the
projection. Web clients on `/community` join that room. The existing
`RealtimeGateway` psub on `match:*` and `ticket:*` extends to
`community:*` with a one-line addition.

---

## Web routes

```
apps/web/src/app/
  community/
    page.tsx                # feed (Recent + Best Wins tabs, sport filter)
    [displayName]/
      page.tsx              # public profile
  settings/
    community/
      page.tsx              # visibility toggle, nickname, bio
```

New components in `apps/web/src/components/`:

- `community-feed.tsx`
- `ticket-card.tsx`
- `copy-to-bet-button.tsx`
- `achievement-grid.tsx`
- `profile-header.tsx`

Copy-to-bet wires into the existing `useBetSlip` hook. Same-market
swap behavior, 5% price tolerance, and market-open validation are all
already enforced by `BettingService.placeTicket`. No new validation
logic — if a copied leg has moved beyond tolerance, the existing
rejection path tells the user.

---

## Phasing

Four sprints, each ~1 week, mirroring the existing Phase 1 / 2a / 2b /
3 rhythm.

### Phase C-1 — Profiles + visibility

- Migration: `User.ticketsPublic`, `nickname`, `bio`, `isAi`, `UserRole.seed`.
- `/api/community/users/:displayName/profile`.
- `/u/[displayName]` page.
- `/settings/community` page.
- No feed yet — just the privacy primitive in production.

### Phase C-2 — Feed + projection

- `CommunityTicket` table + migration.
- `SettlementService.resolveTicket` writes the projection (same
  transaction as the wallet payout).
- Backfill script for existing settled tickets.
- `/api/community/feed` with `recent` sort only.
- `/community` page, ticket cards, sport filter.

### Phase C-3 — Scoring + Best Wins + Copy

- Port deterministic scoring formula from Corwyn community-signals:
  Recency 30 / Inspiration 25 / Odds 15 / Reputation 15 / Copyability 15.
- Recompute on settle + nightly BullMQ job.
- `best` sort path on the feed endpoint.
- Copy-to-bet wired into bet slip.
- `community:feed` Socket.IO room.

### Phase C-4 — Achievements + Seed bettors

- `AchievementDefinition` seed script (5 starter badges).
- Settlement-driven unlock logic, idempotent `UserAchievement` writes.
- Seed bettor accounts (`role: seed`, `isAi: true`).
- Nightly AI ticket generator using Claude Managed Agents API. Reads
  next 24h of fixtures + odds, picks plausible 1–3 leg bets per seed
  account, places via the normal `BettingService.placeTicket` path so
  they settle naturally.

---

## The AI angle

Two hooks worth investing in beyond V1, both reuse the agent pattern
already proven on the Corwyn `analysis-translator`:

1. **Seed bettor agent** — solves cold-start. Scheduled nightly,
   produces 30–60 plausible tickets across the next-24h fixture board.
   Already in V1 as Phase C-4.
2. **Auto-generated bet captions** — optional 1-line analysis per
   placed ticket, written by an agent at placement, shown in feed.
   Replaces the empty-comment-field failure mode without needing a
   comments feature. Schema-ready (`Ticket.analysisText` nullable
   column, added in Phase C-2 migration); UI ships in a follow-up.

---

## Risks + open follow-ups

- **Backfill volume on Phase C-2.** If we accumulate >50k settled
  tickets before C-2 lands, the backfill script needs batching. Trivial
  but worth flagging.
- **Seed bettor PnL impact on house margin.** Seed accounts place real
  tickets through the real settlement flow. Their wins/losses hit the
  PnL dashboard. Mitigation: exclude `role = seed` from the admin PnL
  aggregation query. Funded via a separate admin-credit pool with a
  capped weekly budget.
- **Nickname squatting.** First-come unique constraint. If a user
  changes nickname, the old one is freed. Acceptable for V1 — revisit
  if abuse appears.
