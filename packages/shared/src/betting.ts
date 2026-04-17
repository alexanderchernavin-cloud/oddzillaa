import { z } from 'zod';

export const placeTicketSelectionInput = z.object({
  outcomeId: z.string().uuid(),
  priceAtSubmit: z.number().positive(),
});

export const placeTicketInput = z.object({
  selections: z.array(placeTicketSelectionInput).min(1).max(20),
  stakeUsdt: z.number().positive().max(1_000_000),
});
export type PlaceTicketInput = z.infer<typeof placeTicketInput>;

export const ticketSelectionDto = z.object({
  id: z.string().uuid(),
  outcomeId: z.string().uuid(),
  outcomeFeedId: z.string(),
  outcomeLabel: z.string(),
  marketType: z.string(),
  matchHome: z.string(),
  matchAway: z.string(),
  priceAtSubmit: z.number(),
  status: z.enum(['pending', 'won', 'lost', 'void']),
});
export type TicketSelectionDto = z.infer<typeof ticketSelectionDto>;

export const ticketDto = z.object({
  id: z.string().uuid(),
  stakeUsdt: z.number(),
  totalOdds: z.number(),
  potentialPayout: z.number(),
  status: z.enum(['pending', 'accepted', 'rejected', 'won', 'lost', 'void', 'cashout']),
  rejectReason: z.string().nullable(),
  submittedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().nullable(),
  settledAt: z.string().datetime().nullable(),
  selections: z.array(ticketSelectionDto),
});
export type TicketDto = z.infer<typeof ticketDto>;

export const ticketListDto = z.object({
  tickets: z.array(ticketDto),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type TicketListDto = z.infer<typeof ticketListDto>;

export const walletDto = z.object({
  usdtBalance: z.number(),
  lockedBalance: z.number(),
});
export type WalletDto = z.infer<typeof walletDto>;
