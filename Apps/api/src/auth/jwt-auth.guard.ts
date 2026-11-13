import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { readSessionCookie } from './session-cookie';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const header = String(req.headers.authorization || '');
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    // Cookie first-class; Bearer kept for legacy clients/links.
    const token = bearer || readSessionCookie(req);
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = this.jwt.verify(token);
      if (payload?.purpose === '2fa_pending' || payload?.purpose === 'security_pending') {
        throw new UnauthorizedException('Complete security verification first');
      }
      // Discord OAuth only — bot owners and invited bot-admins.
      const role = payload?.role;
      if (role && role !== 'bot-owner' && role !== 'bot-admin') {
        throw new UnauthorizedException('Discord login required');
      }
      if (!payload?.sub || !/^\d{5,}$/.test(String(payload.sub))) {
        throw new UnauthorizedException('Discord login required');
      }
      req.user = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid token');
    }
  }
}
