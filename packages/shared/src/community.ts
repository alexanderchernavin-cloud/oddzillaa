import { z } from 'zod';

// Public profile, looked up by nickname.
export const communityProfileDto = z.object({
  nickname: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  joinedAt: z.string().datetime(),
  winRate: z.number().min(0).max(1), // won / (won + lost), excluding voids
  roi: z.number(), // (totalReturn - totalStake) / totalStake
  totalSettled: z.number().int(),
  badgeCount: z.number().int(),
});
export type CommunityProfileDto = z.infer<typeof communityProfileDto>;

export const profileTicketSelectionDto = z.object({
  outcomeLabel: z.string(),
  matchHome: z.string(),
  matchAway: z.string(),
  priceAtSubmit: z.number(),
  status: z.enum(['won', 'lost', 'void', 'pending']),
});
export type ProfileTicketSelectionDto = z.infer<typeof profileTicketSelectionDto>;

export const profileTicketDto = z.object({
  id: z.string().uuid(),
  status: z.enum(['won', 'lost', 'void']),
  stakeUsdt: z.number(),
  totalOdds: z.number(),
  payoutUsdt: z.number(),
  settledAt: z.string().datetime(),
  selections: z.array(profileTicketSelectionDto),
});
export type ProfileTicketDto = z.infer<typeof profileTicketDto>;

export const profileTicketsDto = z.object({
  tickets: z.array(profileTicketDto),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ProfileTicketsDto = z.infer<typeof profileTicketsDto>;

// Authed user reading their own community settings.
export const communityMeDto = z.object({
  nickname: z.string().nullable(),
  bio: z.string().nullable(),
  ticketsPublic: z.boolean(),
});
export type CommunityMeDto = z.infer<typeof communityMeDto>;

export const updateVisibilityInput = z.object({
  ticketsPublic: z.boolean(),
});
export type UpdateVisibilityInput = z.infer<typeof updateVisibilityInput>;

export const updateCommunityProfileInput = z.object({
  nickname: z
    .string()
    .trim()
    .min(3, 'Nickname must be at least 3 characters')
    .max(20, 'Nickname must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Nickname may only contain letters, numbers, and underscores')
    .nullable()
    .optional(),
  bio: z
    .string()
    .trim()
    .max(280, 'Bio must be at most 280 characters')
    .nullable()
    .optional(),
});
export type UpdateCommunityProfileInput = z.infer<typeof updateCommunityProfileInput>;

// ---------- Community feed (Phase C-2) ----------

// Card on the chronological feed. Author win-rate / badge-count are added
// in Phase C-3 when scoring lands.
export const communityFeedTicketDto = z.object({
  id: z.string().uuid(),
  author: z.object({
    displayName: z.string(),
    nickname: z.string(),
  }),
  status: z.enum(['won', 'lost', 'void']),
  stakeUsdt: z.number(),
  payoutUsdt: z.number(),
  totalOdds: z.number(),
  numLegs: z.number().int(),
  settledAt: z.string().datetime(),
  selections: z.array(profileTicketSelectionDto),
});
export type CommunityFeedTicketDto = z.infer<typeof communityFeedTicketDto>;

export const communityFeedDto = z.object({
  tickets: z.array(communityFeedTicketDto),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type CommunityFeedDto = z.infer<typeof communityFeedDto>;

export const communityFeedSort = z.enum(['recent']);
export type CommunityFeedSort = z.infer<typeof communityFeedSort>;
