import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 15),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  ODDIN_NODE_ID: z.coerce.number().int().positive().default(1),
  ODDIN_EXCHANGE: z.string().default('unifiedfeed.integration'),
  ODDIN_QUEUE_NAME: z.string().default('oddzilla.consumer'),
  ODDIN_ROUTING_KEY_PATTERN: z.string().default('#'),

  ENABLE_MOCK_FEED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  MOCK_FEED_TICK_MS: z.coerce.number().int().positive().default(2000),
  MOCK_FEED_SEED: z.coerce.number().int().default(42),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@oddzilla.gg'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
