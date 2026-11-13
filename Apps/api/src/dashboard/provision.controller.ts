import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { ProvisionService } from './provision.service';
import { safeEqualString } from '../partner/partner-crypto';

class ProvisionDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsString()
  @MinLength(5)
  ownerId: string;

  @IsString()
  @MinLength(5)
  clientId: string;

  @IsOptional()
  @IsString()
  guildId?: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @IsOptional()
  @IsNumber()
  price?: number;
}

type RateBucket = { count: number; resetAt: number };

/**
 * Legacy internal provisioning for an external purchase site.
 * Prefer Partner HMAC API (`/api/partner/v1/orders`) for new integrations.
 * Protect with header: x-provision-key = PROVISION_API_KEY
 */
@Controller('internal')
export class ProvisionController {
  private static readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly provision: ProvisionService) {}

  @Post('bots/provision')
  provisionBot(
    @Body() body: ProvisionDto,
    @Headers('x-provision-key') key?: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const expected = String(process.env.PROVISION_API_KEY || '').trim();
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.MAKER_ENV === 'production';

    if (!expected) {
      throw new UnauthorizedException('PROVISION_API_KEY not configured');
    }
    if (
      isProd &&
      (/^dev-/i.test(expected) || /change-me/i.test(expected))
    ) {
      throw new UnauthorizedException(
        'PROVISION_API_KEY is a development placeholder; set a strong secret',
      );
    }
    if (!key || !safeEqualString(String(key), expected)) {
      throw new UnauthorizedException('Invalid provision key');
    }

    this.checkRateLimit(String(forwardedFor || 'direct').split(',')[0].trim());

    return this.provision.provision(body);
  }

  private checkRateLimit(bucketKey: string) {
    const limit = Number(process.env.PROVISION_RATE_LIMIT_PER_MIN || 30);
    const now = Date.now();
    const bucket = ProvisionController.buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      ProvisionController.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + 60_000,
      });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpException(
        'Provision rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
