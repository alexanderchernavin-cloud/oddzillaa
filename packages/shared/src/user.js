"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileInputSchema = exports.userProfileSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("./enums");
exports.userProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    displayName: zod_1.z.string(),
    role: zod_1.z.enum([enums_1.UserRole.user, enums_1.UserRole.admin]),
    status: zod_1.z.enum([enums_1.UserStatus.active, enums_1.UserStatus.blocked]),
    mustChangePassword: zod_1.z.boolean(),
    createdAt: zod_1.z.string().datetime(),
});
exports.updateProfileInputSchema = zod_1.z.object({
    displayName: zod_1.z
        .string()
        .trim()
        .min(2, 'Display name must be at least 2 characters')
        .max(40, 'Display name must be at most 40 characters'),
});
//# sourceMappingURL=user.js.map