import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { SecurityMethod } from './account-security.service';
import {
  clearSessionCookie,
  setSessionCookie,
} from './session-cookie';
import {
  clearOAuthStateCookie,
  createOAuthNonce,
  readOAuthStateCookie,
  setOAuthStateCookie,
  verifyOAuthState,
} from './oauth-state';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('discord')
  discordStart(
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    try {
      // Random nonce -> HttpOnly cookie. Discord echoes only the signature.
      const nonce = createOAuthNonce();
      const url = this.auth.getDiscordAuthorizeUrl(state || undefined, nonce);
      setOAuthStateCookie(res, nonce);
      return res.redirect(url);
    } catch (err: any) {
      const message = String(err?.message || 'oauth_start_failed');
      const publicUrl = (
        process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:4084'
      ).replace(/\/$/, '');
      return res.redirect(
        `${publicUrl}/?error=${encodeURIComponent(message.slice(0, 120))}`,
      );
    }
  }

  @Get('discord/callback')
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const publicUrl = (
      process.env.DASHBOARD_PUBLIC_URL || 'http://localhost:4084'
    ).replace(/\/$/, '');

    // One-shot cookie: clear it whatever the outcome.
    const nonce = readOAuthStateCookie(req);
    clearOAuthStateCookie(res);

    if (error || !code) {
      return res.redirect(
        `${publicUrl}/?error=${encodeURIComponent(error || 'oauth_denied')}`,
      );
    }

    let inner: string | null;
    try {
      // Rejects forged/replayed callbacks: bad signature, another browser's
      // nonce, or a flow older than OAUTH_STATE_TTL_MS.
      inner = verifyOAuthState(state, nonce);
    } catch {
      return res.redirect(`${publicUrl}/?error=oauth_state_invalid`);
    }

    try {
      const result = await this.auth.completeDiscordLogin(
        code,
        inner ?? undefined,
      );
      // Session lives in an HttpOnly cookie; the redirect URL carries no token.
      if (result.accessToken) setSessionCookie(res, result.accessToken);
      return res.redirect(result.redirectUrl);
    } catch {
      return res.redirect(`${publicUrl}/?error=oauth_failed`);
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearSessionCookie(res);
    return { ok: true };
  }

  /** Set the session cookie and never leak the JWT in the JSON body. */
  private async finishSecurityLogin(
    res: Response,
    pendingToken: string,
    method: SecurityMethod,
    code: string,
  ) {
    const result = await this.auth.completeSecurityLogin(
      pendingToken,
      method,
      code,
    );
    const { accessToken, ...payload } = result as typeof result & {
      accessToken?: string;
    };
    if (accessToken) setSessionCookie(res, accessToken);
    return payload;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.auth.me(req.user);
  }

  @Get('security/status')
  @UseGuards(JwtAuthGuard)
  securityStatus(@Req() req: any) {
    return this.auth.securityStatus(String(req.user.sub));
  }

  @Post('security/email/start')
  @UseGuards(JwtAuthGuard)
  startEmail(
    @Req() req: any,
    @Body() body: { email?: string },
  ) {
    return this.auth.startEmailSetup(
      String(req.user.sub),
      String(body?.email || ''),
    );
  }

  @Post('security/email/confirm')
  @UseGuards(JwtAuthGuard)
  confirmEmail(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.confirmEmailSetup(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('security/email/send-code')
  @UseGuards(JwtAuthGuard)
  sendEmailCode(@Req() req: any) {
    return this.auth.sendEmailActionCode(String(req.user.sub));
  }

  @Post('security/email/disable')
  @UseGuards(JwtAuthGuard)
  disableEmail(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.disableEmail(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('security/totp/setup')
  @UseGuards(JwtAuthGuard)
  totpSetup(@Req() req: any) {
    return this.auth.beginTotpSetup(String(req.user.sub), req.user.username);
  }

  @Post('security/totp/enable')
  @UseGuards(JwtAuthGuard)
  totpEnable(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.confirmTotpSetup(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('security/totp/disable')
  @UseGuards(JwtAuthGuard)
  totpDisable(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.disableTotp(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('security/backup/generate')
  @UseGuards(JwtAuthGuard)
  backupGenerate(@Req() req: any) {
    return this.auth.enableBackupCodes(String(req.user.sub));
  }

  @Post('security/backup/disable')
  @UseGuards(JwtAuthGuard)
  backupDisable(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.disableBackup(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('security/challenge/send-email')
  sendChallengeEmail(@Body() body: { pendingToken?: string }) {
    return this.auth.sendChallengeEmail(String(body?.pendingToken || ''));
  }

  @Post('security/challenge/verify')
  verifyChallenge(
    @Body()
    body: {
      pendingToken?: string;
      method?: SecurityMethod;
      code?: string;
    },
    @Res({ passthrough: true }) res: Response,
  ) {
    const method = body?.method;
    if (method !== 'email' && method !== 'totp' && method !== 'backup') {
      throw new BadRequestException('Choose a valid protection method');
    }
    return this.finishSecurityLogin(
      res,
      String(body?.pendingToken || ''),
      method,
      String(body?.code || ''),
    );
  }

  /** @deprecated legacy aliases */
  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  legacyStatus(@Req() req: any) {
    return this.auth.securityStatus(String(req.user.sub));
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  legacySetup(@Req() req: any) {
    return this.auth.beginTotpSetup(String(req.user.sub), req.user.username);
  }

  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  legacyEnable(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.confirmTotpSetup(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  legacyDisable(@Req() req: any, @Body() body: { code?: string }) {
    return this.auth.disableTotp(
      String(req.user.sub),
      String(body?.code || ''),
    );
  }

  @Post('2fa/verify')
  legacyVerify(
    @Body() body: { pendingToken?: string; code?: string; method?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const method =
      body?.method === 'email' || body?.method === 'backup'
        ? body.method
        : 'totp';
    return this.finishSecurityLogin(
      res,
      String(body?.pendingToken || ''),
      method,
      String(body?.code || ''),
    );
  }
}
