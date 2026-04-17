import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  setupTestApp,
  teardownTestApp,
  getHttpServer,
  getPrisma,
  createUser,
  loginUser,
  authHeader,
} from './setup';

describe('Wallet', () => {
  beforeAll(async () => {
    await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp();
  });

  it('GET /api/wallet/balance returns balance for authenticated user', async () => {
    const user = await createUser({ email: 'wallet-bal@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    const res = await request(getHttpServer())
      .get('/api/wallet/balance')
      .set(authHeader(login.accessToken))
      .expect(200);

    expect(res.body).toHaveProperty('usdtBalance');
    expect(res.body).toHaveProperty('lockedBalance');
    expect(res.body.usdtBalance).toBe(0);
  });

  it('GET /api/wallet/balance rejects unauthenticated', async () => {
    await request(getHttpServer())
      .get('/api/wallet/balance')
      .expect(401);
  });

  it('POST /api/wallet/admin-credit rejects non-admin', async () => {
    const user = await createUser({ email: 'wallet-nonadmin@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    const prisma = getPrisma();
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { email: user.email } });

    await request(getHttpServer())
      .post('/api/wallet/admin-credit')
      .set(authHeader(login.accessToken))
      .send({ userId: dbUser.id, amount: 100, reason: 'test' })
      .expect(403);
  });
});
