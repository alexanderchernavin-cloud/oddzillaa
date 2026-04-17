"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordInputSchema = exports.authResponseSchema = exports.refreshInputSchema = exports.loginInputSchema = exports.signupInputSchema = void 0;
const zod_1 = require("zod");
exports.signupInputSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(254),
    password: zod_1.z
        .string()
        .min(12, 'Password must be at least 12 characters')
        .max(128, 'Password must be at most 128 characters'),
    displayName: zod_1.z
        .string()
        .trim()
        .min(2, 'Display name must be at least 2 characters')
        .max(40, 'Display name must be at most 40 characters'),
});
exports.loginInputSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.refreshInputSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1),
});
exports.authResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    refreshToken: zod_1.z.string(),
    expiresAt: zod_1.z.string().datetime(),
});
exports.changePasswordInputSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(12).max(128),
})
    .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
});
//# sourceMappingURL=auth.js.map