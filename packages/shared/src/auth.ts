import { z } from 'zod';

export const signupInputSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be at most 128 characters'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(40, 'Display name must be at most 40 characters'),
});
export type SignupInput = z.infer<typeof signupInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const refreshInputSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshInput = z.infer<typeof refreshInputSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string(),
  expiresAt: z.string().datetime(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12).max(128),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
