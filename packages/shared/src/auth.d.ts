import { z } from 'zod';
export declare const signupInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
}, {
    email: string;
    password: string;
    displayName: string;
}>;
export type SignupInput = z.infer<typeof signupInputSchema>;
export declare const loginInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export declare const refreshInputSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export type RefreshInput = z.infer<typeof refreshInputSchema>;
export declare const authResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    refreshToken: z.ZodString;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
    accessToken: string;
    expiresAt: string;
}, {
    refreshToken: string;
    accessToken: string;
    expiresAt: string;
}>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export declare const changePasswordInputSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
//# sourceMappingURL=auth.d.ts.map