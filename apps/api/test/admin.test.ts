import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  setupTestApp,
  teardownTestApp,
  getHttpServer,
  createUser,
  loginUser,
  authHeader,
} from './setup';

describe('Admin', () => {
  beforeAll(async () => {
    await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp();
  });

  it('GET /api/admin/settings rejects non-admin', async () => {
    const user = await createUser({ email: 'admin-reject@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    await request(getHttpServer())
      .get('/api/admin/settings')
      .set(authHeader(login.accessToken))
      .expect(403);
  });

  it('GET /api/admin/users rejects non-admin', async () => {
    const user = await createUser({ email: 'admin-users-reject@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    await request(getHttpServer())
      .get('/api/admin/users')
      .set(authHeader(login.accessToken))
      .expect(403);
  });

  it('GET /api/admin/pnl rejects non-admin', async () => {
    const user = await createUser({ email: 'admin-pnl-reject@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    await request(getHttpServer())
      .get('/api/admin/pnl')
      .set(authHeader(login.accessToken))
      .expect(403);
  });

  it('GET /api/admin/settings rejects unauthenticated', async () => {
    await request(getHttpServer())
      .get('/api/admin/settings')
      .expect(401);
  });
});
