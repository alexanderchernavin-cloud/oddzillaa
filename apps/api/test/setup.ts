import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

let app: INestApplication;
let prisma: PrismaService;
let moduleRef: TestingModule;

export async function setupTestApp(): Promise<void> {
  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  prisma = moduleRef.get(PrismaService);
}

export async function teardownTestApp(): Promise<void> {
  await app?.close();
}

export function getApp(): INestApplication {
  return app;
}

export function getPrisma(): PrismaService {
  return prisma;
}

export function getHttpServer() {
  return app.getHttpServer();
}

let userCounter = 0;

export async function createUser(
  overrides: { email?: string; password?: string; displayName?: string } = {},
): Promise<{ email: string; password: string; displayName: string }> {
  userCounter++;
  const user = {
    email: overrides.email ?? `test${userCounter}@oddzilla.test`,
    password: overrides.password ?? 'TestPassword123!',
    displayName: overrides.displayName ?? `TestUser${userCounter}`,
  };

  await request(getHttpServer())
    .post('/api/auth/signup')
    .send(user)
    .expect(201);

  return user;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ accessToken: string; cookies: string[] }> {
  const res = await request(getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: res.body.accessToken,
    cookies: res.headers['set-cookie'] as unknown as string[],
  };
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
