import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import {
  decryptPartnerSecret,
  safeEqualHex,
  signPartnerPayload,
} from './partner-crypto';
import { PARTNER_SCOPES_KEY } from './partner-scopes.decorator';

type RateBucket = { count: number; resetAt: number };

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const keyId = String(req.headers['x-maker-key-id'] || '').trim();
    const timestamp = String(req.headers['x-maker-timestamp'] || '').trim();
    const signature = String(req.headers['x-maker-signature'] || '').trim();

    if (!keyId || !timestamp || !signature) {
      throw new UnauthorizedException(
        'Missing X-Maker-Key-Id, X-Maker-Timestamp, or X-Maker-Signature',
      );
    }

    const skewSec = Number(process.env.PARTNER_HMAC_MAX_SKEW_SEC || 300);
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new UnauthorizedException('Invalid X-Maker-Timestamp');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > skewSec) {
      throw new UnauthorizedException('Request timestamp outside allowed skew');
    }

    const partner = await this.prisma.client.partnerApiKey.findUnique({
      where: { keyId },
    });
    if (!partner || !partner.enabled) {
      throw new UnauthorizedException('Invalid or disabled partner key');
    }

    let secret: string;
    try {
      secret = decryptPartnerSecret(partner.secretEnc);
    } catch {
      throw new UnauthorizedException('Partner key secret is unreadable');
    }

    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : req.method === 'GET' || req.method === 'HEAD'
            ? ''
            : JSON.stringify(req.body ?? {});

    const expected = signPartnerPayload(secret, timestamp, rawBody);
    if (!safeEqualHex(expected, signature)) {
      throw new UnauthorizedException('Invalid request signature');
    }

    // Rate-limit only after a valid signature so forged keyIds cannot burn buckets.
    this.checkRateLimit(keyId);

    const requiredScopes =
      this.reflector.getAllAndOverride<string[]>(PARTNER_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];
    for (const scope of requiredScopes) {
      if (!partner.scopes.includes(scope)) {
        throw new ForbiddenException(`Missing required scope: ${scope}`);
      }
    }

    req.partner = {
      id: partner.id,
      keyId: partner.keyId,
      name: partner.name,
      scopes: partner.scopes,
    };
    return true;
  }

  private checkRateLimit(keyId: string) {
    const limit = Number(process.env.PARTNER_RATE_LIMIT_PER_MIN || 60);
    const now = Date.now();
    const bucket = this.buckets.get(keyId);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(keyId, { count: 1, resetAt: now + 60_000 });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException(
        'Partner rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
