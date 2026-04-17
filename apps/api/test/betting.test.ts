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

describe('Betting', () => {
  beforeAll(async () => {
    await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp();
  });

  it('POST /api/betting/tickets rejects unauthenticated', async () => {
    await request(getHttpServer())
      .post('/api/betting/tickets')
      .send({ selections: [], stakeUsdt: 10 })
      .expect(401);
  });

  it('POST /api/betting/tickets rejects empty selections', async () => {
    const user = await createUser({ email: 'bet-empty@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    await request(getHttpServer())
      .post('/api/betting/tickets')
      .set(authHeader(login.accessToken))
      .send({ selections: [], stakeUsdt: 10 })
      .expect(400);
  });

  it('GET /api/betting/tickets returns empty list for new user', async () => {
    const user = await createUser({ email: 'bet-list@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    const res = await request(getHttpServer())
      .get('/api/betting/tickets')
      .set(authHeader(login.accessToken))
      .expect(200);

    expect(res.body.tickets).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('POST /api/betting/tickets rejects nonexistent outcome', async () => {
    const user = await createUser({ email: 'bet-bad-oc@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    await request(getHttpServer())
      .post('/api/betting/tickets')
      .set(authHeader(login.accessToken))
      .send({
        selections: [
          { outcomeId: '00000000-0000-0000-0000-000000000000', priceAtSubmit: 1.5 },
        ],
        stakeUsdt: 10,
      })
      .expect(400);
  });
});
