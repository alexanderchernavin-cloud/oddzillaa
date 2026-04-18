import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ENV_TOKEN } from './config/config.module';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const env = app.get<Env>(ENV_TOKEN);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  const corsOrigins = env.WEB_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(env.API_PORT);
  new Logger('Bootstrap').log(
    `Oddzilla API listening on http://localhost:${env.API_PORT}/api (CORS origins ${corsOrigins.join(', ')})`,
  );
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap Oddzilla API:', err);
  process.exit(1);
});
