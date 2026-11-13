import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { safeEqualString } from '../partner/partner-crypto';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = String(
      process.env.BOT_INTERNAL_API_KEY ||
        process.env.PROVISION_API_KEY ||
        '',
    ).trim();
    if (!expected) {
      throw new UnauthorizedException('BOT_INTERNAL_API_KEY not configured');
    }
    const isProd =
      process.env.NODE_ENV === 'production' ||
      process.env.MAKER_ENV === 'production';
    if (
      isProd &&
      (/^dev-/i.test(expected) || /change-me/i.test(expected))
    ) {
      throw new UnauthorizedException(
        'BOT_INTERNAL_API_KEY is a development placeholder; set a strong secret',
      );
    }
    const header =
      req.headers['x-bot-internal-key'] ||
      req.headers['x-api-key'] ||
      '';
    const auth = String(req.headers.authorization || '');
    const bearer = auth.toLowerCase().startsWith('bearer ')
      ? auth.slice(7).trim()
      : '';
    const provided = String(header || bearer || '');
    if (!provided || !safeEqualString(provided, expected)) {
      throw new UnauthorizedException('Invalid internal API key');
    }
    return true;
  }
}
