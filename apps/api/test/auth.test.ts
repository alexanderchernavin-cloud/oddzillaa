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

describe('Auth', () => {
  beforeAll(async () => {
    await setupTestApp();
  });
  afterAll(async () => {
    await teardownTestApp();
  });

  it('POST /api/auth/signup creates a user', async () => {
    const res = await request(getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'signup-test@oddzilla.test',
        password: 'SecurePass123!x',
        displayName: 'SignupTest',
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('expiresAt');
    expect(res.body).not.toHaveProperty('refreshToken');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('POST /api/auth/signup rejects duplicate email', async () => {
    await request(getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: 'signup-test@oddzilla.test',
        password: 'AnotherPass123!x',
        displayName: 'Dupe',
      })
      .expect(409);
  });

  it('POST /api/auth/login returns access token and sets refresh cookie', async () => {
    const user = await createUser({ email: 'login-test@oddzilla.test' });
    const res = await request(getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    expect(res.body.accessToken).toBeTruthy();
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const hasRefreshCookie = (Array.isArray(cookies) ? cookies : [cookies]).some(
      (c: string) => c.includes('oddzilla_refresh'),
    );
    expect(hasRefreshCookie).toBe(true);
  });

  it('POST /api/auth/refresh rotates tokens via cookie', async () => {
    const user = await createUser({ email: 'refresh-test@oddzilla.test' });
    const login = await loginUser(user.email, user.password);
    const cookieHeader = login.cookies.join('; ');

    const res = await request(getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(200);

    expect(res.body.accessToken).toBeTruthy();
  });

  it('GET /api/auth/me returns profile', async () => {
    const user = await createUser({ email: 'me-test@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    const res = await request(getHttpServer())
      .get('/api/auth/me')
      .set(authHeader(login.accessToken))
      .expect(200);

    expect(res.body.email).toBe(user.email);
    expect(res.body.displayName).toBe(user.displayName);
  });

  it('POST /api/auth/logout clears refresh cookie', async () => {
    const user = await createUser({ email: 'logout-test@oddzilla.test' });
    const login = await loginUser(user.email, user.password);

    const res = await request(getHttpServer())
      .post('/api/auth/logout')
      .set(authHeader(login.accessToken))
      .set('Cookie', login.cookies.join('; '))
      .expect(204);

    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const cleared = (Array.isArray(cookies) ? cookies : [cookies]).some(
        (c: string) =>
          c.includes('oddzilla_refresh') &&
          (c.includes('Max-Age=0') || c.includes('Expires=Thu, 01 Jan 1970')),
      );
      expect(cleared).toBe(true);
    }
  });
});
