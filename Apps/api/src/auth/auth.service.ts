import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DashboardAccessService } from '../dashboard/dashboard-access.service';
import { BotAdminsService } from '../dashboard/bot-admins.service';
import { ApplyStoreService } from '../apply/apply-store.service';
import { ApplyAuditService } from '../apply/apply-audit.service';
import {
  AccountSecurityService,
  SecurityMethod,
} from './account-security.service';
import { signOAuthState } from './oauth-state';

export type DiscordLoginResult = {
  redirectUrl: string;
  error?: string;
  requiresSecurity?: boolean;
  methods?: SecurityMethod[];
  /** Set for a completed login; delivered as an HttpOnly cookie, never in the URL. */
  accessToken?: string;
  [key: string]: unknown;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly access: DashboardAccessService,
    private readonly admins: BotAdminsService,
    private readonly store: ApplyStoreService,
    private readonly security: AccountSecurityService,
    private readonly audit: ApplyAuditService,
  ) {}

  private publicUrl() {
    return (
      process.env.DASHBOARD_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:4084'
    ).replace(/\/$/, '');
  }

  private clientId() {
    return process.env.DISCORD_CLIENT_ID || '';
  }

  private clientSecret() {
    return process.env.DISCORD_CLIENT_SECRET || '';
  }

  private redirectUri() {
    return (
      process.env.DISCORD_REDIRECT_URI ||
      'http://localhost:3011/api/auth/discord/callback'
    );
  }

  /**
   * Build the Discord authorize URL.
   *
   * `state` is wrapped into a signed, nonce-bound envelope (see oauth-state.ts)
   * so the callback can prove it belongs to the browser that started the flow.
   * The caller must persist `nonce` in the maker_oauth_state cookie.
   */
  getDiscordAuthorizeUrl(state?: string, nonce?: string) {
    if (!this.clientId()) {
      throw new BadRequestException(
        'DISCORD_CLIENT_ID is not configured on the API',
      );
    }
    const params = new URLSearchParams({
      client_id: this.clientId(),
      response_type: 'code',
      scope: 'identify email',
      redirect_uri: this.redirectUri(),
    });
    // Signed envelope when a nonce was issued; raw value only for internal
    // callers that build the URL themselves (no browser round-trip).
    if (nonce) params.set('state', signOAuthState(state, nonce));
    else if (state) params.set('state', state);
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  private async ownedBotIds(discordUserId: string): Promise<string[]> {
    const id = String(discordUserId);
    const bots = await this.store.listAllBotsAsync();
    const fromTokens = bots
      .filter(
        (b: any) =>
          String(b?.Owner || '') === id || String(b?.Buyer || '') === id,
      )
      .map((b: any) => String(b.ClientID));

    const fromAccess = (await this.access.listAll())
      .filter((r) => String(r.ownerId || '') === id)
      .map((r) => String(r.clientId));

    return [...new Set([...fromTokens, ...fromAccess])];
  }

  async signSessionToken(user: DiscordUser) {
    const botIds = await this.ownedBotIds(user.id);
    const adminBotIds = await this.admins.adminBotIdsForUser(user.id);
    const role =
      botIds.length === 0 && adminBotIds.length > 0 ? 'bot-admin' : 'bot-owner';
    const security = await this.security.status(user.id);
    const accessToken = this.jwt.sign({
      sub: user.id,
      role,
      username: user.global_name || user.username,
      avatar: user.avatar || null,
      botIds,
      adminBotIds,
      permissions:
        role === 'bot-admin' ? ['applications:decide'] : ['*'],
    });
    return {
      accessToken,
      user: {
        id: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar || null,
        role: role as 'bot-owner' | 'bot-admin',
        botIds,
        adminBotIds,
        permissions:
          role === 'bot-admin' ? ['applications:decide'] : ['*'],
        security,
        discordEmail: user.email || null,
      },
    };
  }

  private async signPendingSecurityToken(user: DiscordUser, next: string) {
    const challenge = await this.security.challengeInfo(user.id);
    return this.jwt.sign(
      {
        sub: user.id,
        purpose: 'security_pending',
        username: user.global_name || user.username,
        avatar: user.avatar || null,
        next,
        methods: challenge.methods,
        maskedEmail: challenge.maskedEmail,
      },
      { expiresIn: '10m' },
    );
  }

  async exchangeCode(code: string): Promise<DiscordUser> {
    if (!this.clientId() || !this.clientSecret()) {
      throw new BadRequestException('Discord OAuth is not configured');
    }

    const body = new URLSearchParams({
      client_id: this.clientId(),
      client_secret: this.clientSecret(),
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri(),
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!tokenRes.ok) {
      throw new UnauthorizedException('Failed to exchange Discord code');
    }
    const tokenJson: any = await tokenRes.json();
    const access = tokenJson.access_token;
    if (!access) throw new UnauthorizedException('No Discord access token');

    const meRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access}` },
    });
    if (!meRes.ok) {
      throw new UnauthorizedException('Failed to fetch Discord user');
    }
    return (await meRes.json()) as DiscordUser;
  }

  async completeDiscordLogin(
    code: string,
    state?: string,
  ): Promise<DiscordLoginResult> {
    const discordUser = await this.exchangeCode(code);

    let next = '/dashboard';
    let error: string | null = null;

    if (state && String(state).startsWith('admin:')) {
      const inviteSlug = String(state).slice('admin:'.length);
      try {
        const invite = await this.admins.acceptInvite(inviteSlug, discordUser.id);
        await this.audit.write(
          invite.clientId,
          'admin_accept',
          { slug: inviteSlug },
          discordUser.id,
        );
        next = `/dashboard/${invite.clientId}/requests`;
      } catch {
        error = 'invalid_admin_invite';
        next = '/?error=invalid_admin_invite';
      }
    } else if (state) {
      const record = await this.access.getBySlug(state);
      if (!record) {
        error = 'invalid_link';
        next = '/?error=invalid_link';
      } else if (
        record.ownerId &&
        String(record.ownerId) !== String(discordUser.id)
      ) {
        error = 'owner_mismatch';
        next = '/?error=owner_mismatch';
      } else if (
        !record.ownerId &&
        !(await this.ownedBotIds(discordUser.id)).includes(String(record.clientId))
      ) {
        const bot =
          (await this.store.getBotAsync(record.clientId)) ||
          this.store.getBot(record.clientId);
        const ok =
          bot &&
          (String(bot.Owner) === String(discordUser.id) ||
            String(bot.Buyer || '') === String(discordUser.id));
        if (!ok) {
          error = 'owner_mismatch';
          next = '/?error=owner_mismatch';
        } else {
          next = `/dashboard/${record.clientId}`;
        }
      } else {
        next = `/dashboard/${record.clientId}`;
      }
    }

    if (error) {
      return {
        redirectUrl: `${this.publicUrl()}${next}`,
        error,
      };
    }

    if (await this.security.hasAnyProtection(discordUser.id)) {
      const pending = await this.signPendingSecurityToken(discordUser, next);
      const challenge = await this.security.challengeInfo(discordUser.id);
      const params = new URLSearchParams({
        pending,
        next,
        methods: challenge.methods.join(','),
      });
      if (challenge.maskedEmail) {
        params.set('email', challenge.maskedEmail);
      }
      return {
        redirectUrl: `${this.publicUrl()}/auth/callback?${params.toString()}`,
        requiresSecurity: true,
        methods: challenge.methods,
      };
    }

    const signed = await this.signSessionToken(discordUser);
    // The token is delivered as an HttpOnly cookie by the controller, never in
    // the URL (browser history, referrers and proxy logs must not see it).
    const params = new URLSearchParams({ next });
    return {
      redirectUrl: `${this.publicUrl()}/auth/callback?${params.toString()}`,
      ...signed,
    };
  }

  private readPending(pendingToken: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(pendingToken);
    } catch {
      throw new UnauthorizedException(
        'Security session expired. Sign in again.',
      );
    }
    if (
      (payload?.purpose !== 'security_pending' &&
        payload?.purpose !== '2fa_pending') ||
      !payload?.sub
    ) {
      throw new UnauthorizedException('Invalid security session');
    }
    return payload;
  }

  async sendChallengeEmail(pendingToken: string) {
    const payload = this.readPending(pendingToken);
    return this.security.sendLoginEmailCode(String(payload.sub));
  }

  async completeSecurityLogin(
    pendingToken: string,
    method: SecurityMethod,
    code: string,
  ) {
    const payload = this.readPending(pendingToken);
    const ok = await this.security.verifyLogin(
      String(payload.sub),
      method,
      code,
    );
    if (!ok) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const signed = await this.signSessionToken({
      id: String(payload.sub),
      username: String(payload.username || payload.sub),
      avatar: payload.avatar || null,
    });

    return {
      ...signed,
      next:
        typeof payload.next === 'string' && payload.next.startsWith('/')
          ? payload.next
          : '/dashboard',
    };
  }

  async me(payload: any) {
    const botIds = await this.ownedBotIds(String(payload.sub));
    const adminBotIds = await this.admins.adminBotIdsForUser(String(payload.sub));
    const role =
      botIds.length === 0 && adminBotIds.length > 0
        ? 'bot-admin'
        : 'bot-owner';
    const security = await this.security.status(String(payload.sub));
    return {
      id: payload.sub,
      username: payload.username,
      avatar: payload.avatar || null,
      role,
      botIds,
      adminBotIds,
      permissions: role === 'bot-admin' ? ['applications:decide'] : ['*'],
      security,
      // legacy fields for older UI
      twoFactorEnabled: security.totp.enabled,
      recoveryCodesRemaining: security.backup.remaining,
    };
  }

  async securityStatus(userId: string) {
    return this.security.status(userId);
  }

  startEmailSetup(userId: string, email: string) {
    return this.security.startEmailSetup(userId, email);
  }

  async confirmEmailSetup(userId: string, code: string) {
    return this.security.confirmEmailSetup(userId, code);
  }

  disableEmail(userId: string, code: string) {
    return this.security.disableEmail(userId, code);
  }

  sendEmailActionCode(userId: string) {
    return this.security.sendEmailActionCode(userId);
  }

  beginTotpSetup(userId: string, username?: string) {
    return this.security.beginTotpSetup(userId, username || String(userId));
  }

  async confirmTotpSetup(userId: string, code: string) {
    return this.security.confirmTotpSetup(userId, code);
  }

  disableTotp(userId: string, code: string) {
    return this.security.disableTotp(userId, code);
  }

  async enableBackupCodes(userId: string) {
    return this.security.enableBackupCodes(userId);
  }

  disableBackup(userId: string, code: string) {
    return this.security.disableBackup(userId, code);
  }
}
