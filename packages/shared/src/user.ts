import { z } from 'zod';
import { UserRole, UserStatus } from './enums';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum([UserRole.user, UserRole.admin, UserRole.seed]),
  status: z.enum([UserStatus.active, UserStatus.blocked]),
  mustChangePassword: z.boolean(),
  createdAt: z.string().datetime(),
});
export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateProfileInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(40, 'Display name must be at most 40 characters'),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
