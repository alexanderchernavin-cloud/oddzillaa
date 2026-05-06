// Enums mirrored from the Prisma schema. Kept string-literal so they serialize
// identically across the wire and remain valid Zod enum inputs.

export const UserRole = { user: 'user', admin: 'admin', seed: 'seed' } as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const UserStatus = { active: 'active', blocked: 'blocked' } as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const TicketStatus = {
  pending: 'pending',
  accepted: 'accepted',
  rejected: 'rejected',
  won: 'won',
  lost: 'lost',
  void: 'void',
  cashout: 'cashout',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const MarketStatus = {
  open: 'open',
  suspended: 'suspended',
  settled: 'settled',
  cancelled: 'cancelled',
} as const;
export type MarketStatus = (typeof MarketStatus)[keyof typeof MarketStatus];

export const OutcomeResult = {
  unsettled: 'unsettled',
  won: 'won',
  lost: 'lost',
  void: 'void',
} as const;
export type OutcomeResult = (typeof OutcomeResult)[keyof typeof OutcomeResult];

export const FeedMessageType = {
  alive: 'alive',
  odds_change: 'odds_change',
  fixture_change: 'fixture_change',
  bet_cancel: 'bet_cancel',
  bet_settlement: 'bet_settlement',
  rollback_bet_cancel: 'rollback_bet_cancel',
  rollback_bet_settlement: 'rollback_bet_settlement',
  snapshot_complete: 'snapshot_complete',
} as const;
export type FeedMessageType = (typeof FeedMessageType)[keyof typeof FeedMessageType];

export const ProducerStatus = {
  up: 'up',
  down: 'down',
  unknown: 'unknown',
} as const;
export type ProducerStatus = (typeof ProducerStatus)[keyof typeof ProducerStatus];
