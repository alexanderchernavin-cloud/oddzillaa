import { z } from 'zod';
export declare const userProfileSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<["user", "admin"]>;
    status: z.ZodEnum<["active", "blocked"]>;
    mustChangePassword: z.ZodBoolean;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "blocked";
    id: string;
    createdAt: string;
    email: string;
    displayName: string;
    role: "user" | "admin";
    mustChangePassword: boolean;
}, {
    status: "active" | "blocked";
    id: string;
    createdAt: string;
    email: string;
    displayName: string;
    role: "user" | "admin";
    mustChangePassword: boolean;
}>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export declare const updateProfileInputSchema: z.ZodObject<{
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    displayName: string;
}, {
    displayName: string;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
//# sourceMappingURL=user.d.ts.map