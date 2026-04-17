import { z } from 'zod';

export const outcomeDto = z.object({
  id: z.string().uuid(),
  feedId: z.string(),
  label: z.string(),
  price: z.number().nullable(),
  status: z.enum(['active', 'inactive']),
  result: z.enum(['unsettled', 'won', 'lost', 'void']),
});
export type OutcomeDto = z.infer<typeof outcomeDto>;

export const marketDto = z.object({
  id: z.string().uuid(),
  feedId: z.string(),
  type: z.enum(['match_winner', 'map_winner']),
  specifier: z.string().nullable(),
  status: z.enum(['open', 'suspended', 'settled', 'cancelled']),
  favourite: z.boolean(),
  outcomes: z.array(outcomeDto),
});
export type MarketDto = z.infer<typeof marketDto>;

export const matchDto = z.object({
  id: z.string().uuid(),
  feedId: z.string(),
  homeName: z.string(),
  awayName: z.string(),
  startTime: z.string().datetime(),
  status: z.enum(['scheduled', 'live', 'finished', 'cancelled', 'postponed']),
  homeScore: z.number().nullable(),
  awayScore: z.number().nullable(),
  sportName: z.string(),
  tournamentName: z.string(),
  markets: z.array(marketDto),
});
export type MatchDto = z.infer<typeof matchDto>;

export const sportDto = z.object({
  id: z.string().uuid(),
  name: z.string(),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
  ),
});
export type SportDto = z.infer<typeof sportDto>;

export const matchUpdateDelta = z.object({
  matchId: z.string().uuid(),
  markets: z.array(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['open', 'suspended', 'settled', 'cancelled']),
      outcomes: z.array(
        z.object({
          id: z.string().uuid(),
          price: z.number().nullable(),
          status: z.enum(['active', 'inactive']),
        }),
      ),
    }),
  ),
  ts: z.string().datetime(),
});
export type MatchUpdateDelta = z.infer<typeof matchUpdateDelta>;
