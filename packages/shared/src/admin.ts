import { z } from 'zod';

export const adminSettingDto = z.object({
  key: z.string(),
  value: z.unknown(),
  updatedAt: z.string().datetime(),
});
export type AdminSettingDto = z.infer<typeof adminSettingDto>;

export const updateSettingInput = z.object({
  value: z.unknown(),
});
export type UpdateSettingInput = z.infer<typeof updateSettingInput>;

export const userDetailDto = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'blocked']),
  globalLimitUsdt: z.number(),
  betDelaySeconds: z.number().int(),
  usdtBalance: z.number(),
  lockedBalance: z.number(),
  createdAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable(),
});
export type UserDetailDto = z.infer<typeof userDetailDto>;

export const userListDto = z.object({
  users: z.array(userDetailDto),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type UserListDto = z.infer<typeof userListDto>;

export const updateUserInput = z.object({
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'blocked']).optional(),
  globalLimitUsdt: z.number().min(0).optional(),
  betDelaySeconds: z.number().int().min(0).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserInput>;

export const creditWalletInput = z.object({
  amount: z.number().positive(),
  reason: z.string().min(1).max(200),
});
export type CreditWalletInput = z.infer<typeof creditWalletInput>;

export const pnlSummaryDto = z.object({
  totalStaked: z.number(),
  totalPaidOut: z.number(),
  netPnl: z.number(),
  activeTickets: z.number().int(),
  totalTickets: z.number().int(),
});
export type PnlSummaryDto = z.infer<typeof pnlSummaryDto>;
