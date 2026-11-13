import './polyfills';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { apiRateLimiters } from './common/rate-limit.middleware';
import { assertTokenEncryptionKey } from '@maker/database';

const envDir = path.resolve(__dirname, '..');
config({ path: path.join(envDir, '.env') });
// Only when `npm run share` sets MAKER_SHARE=1 — leftover .env.share must NOT
// override localhost during `npm run start` / `npm run dev`.
if (process.env.MAKER_SHARE === '1' || process.env.MAKER_SHARE === 'true') {
  config({ path: path.join(envDir, '.env.share'), override: true });
}

function resolveMakerRoot() {
  const candidates = [
    path.resolve(__dirname, '../../..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(process.cwd(), process.env.MAKER_ROOT || '../..'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'Maker', 'Json-Database'))) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), '../..');
}

async function bootstrap() {
  // Refuse to serve traffic without a working token-encryption key.
  assertTokenEncryptionKey();

  const makerRoot = resolveMakerRoot();
  process.chdir(makerRoot);
  process.env.MAKER_ROOT = makerRoot;

  if (!process.env.DATA_WRITE_MODE) process.env.DATA_WRITE_MODE = 'postgres';
  if (!process.env.DATA_READ_SOURCE) process.env.DATA_READ_SOURCE = 'postgres';
  if (!process.env.DATA_SHADOW_COMPARE) process.env.DATA_SHADOW_COMPARE = 'false';
  if (!process.env.REDIS_URL) process.env.REDIS_URL = 'redis://127.0.0.1:6379';

  // Avatar/banner are sent as base64 data URLs (~33% larger than the file).
  const bodyLimit = process.env.BODY_LIMIT || '50mb';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bodyParser: false,
  });
  app.use(
    json({
      limit: bodyLimit,
      verify: (req: any, _res, buf) => {
        // Needed for Partner API HMAC (X-Maker-Signature over raw body)
        req.rawBody = buf?.length ? buf.toString('utf8') : '';
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // Real client IP for rate limiting when running behind nginx/CDN.
  const trustProxy = process.env.TRUST_PROXY;
  app.set(
    'trust proxy',
    trustProxy ? (/^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy) : 1,
  );

  // Flood protection (in-memory; replace with Redis for multi-instance).
  app.use('/api', apiRateLimiters.global);
  app.use('/api/auth/security', apiRateLimiters.authSecurity);
  app.use('/api/auth', apiRateLimiters.auth);

  const corsRaw = process.env.CORS_ORIGIN || 'http://localhost:4084';
  const corsOrigins = corsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.MAKER_ENV === 'production';
  if (isProd) {
    const weak: string[] = [];
    for (const [k, v] of Object.entries({
      JWT_SECRET: process.env.JWT_SECRET,
      BOT_TOKEN_ENCRYPTION_KEY: process.env.BOT_TOKEN_ENCRYPTION_KEY,
      PROVISION_API_KEY: process.env.PROVISION_API_KEY,
      BOT_INTERNAL_API_KEY: process.env.BOT_INTERNAL_API_KEY,
      DASHBOARD_PUBLIC_URL: process.env.DASHBOARD_PUBLIC_URL,
    })) {
      const val = String(v || '');
      if (
        !val ||
        /change-me|^dev-/i.test(val) ||
        (k === 'DASHBOARD_PUBLIC_URL' && /localhost|127\.0\.0\.1/i.test(val))
      ) {
        weak.push(k);
      }
    }
    if (weak.length) {
      throw new Error(
        `Production env incomplete or unsafe: ${weak.join(', ')}. See .env.production.checklist.md`,
      );
    }
  }

  const port = Number(process.env.PORT || 3011);
  await app.listen(port);

  const logger = new Logger('api');
  logger.log(`Apply API → http://127.0.0.1:${port}/api`);
  logger.log(`Maker root → ${makerRoot}`);
  logger.log(
    `Dashboard URL → ${process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:4084'}`,
  );
  logger.log(
    `OAuth redirect → ${process.env.DISCORD_REDIRECT_URI || 'http://localhost:3011/api/auth/discord/callback'}`,
  );
  logger.log(
    `Partner API → /api/partner/v1 (HMAC) | legacy provision → /api/internal/bots/provision`,
  );
  const smtpReady = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
  logger.log(
    smtpReady
      ? `Mail SMTP → ready (${process.env.SMTP_HOST})`
      : 'Mail SMTP → not configured (codes will log to console)',
  );
}

bootstrap();
