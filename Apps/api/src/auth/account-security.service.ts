import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { MailService } from './mail.service';
import { PlatformRepository } from '../prisma/repositories/platform.repository';

export type SecurityMethod = 'email' | 'totp' | 'backup';

export type SecurityRecord = {
  email: {
    enabled: boolean;
    address: string | null;
    pendingAddress: string | null;
    pendingCodeHash: string | null;
    pendingExpiresAt: string | null;
    enabledAt: string | null;
  };
  totp: {
    enabled: boolean;
    secret: string | null;
    pendingSecret: string | null;
    enabledAt: string | null;
  };
  backup: {
    enabled: boolean;
    hashes: string[];
    enabledAt: string | null;
  };
  loginEmail: {
    codeHash: string | null;
    expiresAt: string | null;
  };
  updatedAt: string;
};

type Store = {
  byUserId: Record<string, SecurityRecord>;
};

const NS = 'dashboard_account_security';
const STORE_KEY = '__store__';

@Injectable()
export class AccountSecurityService {
  private cache: Store | null = null;

  constructor(
    private readonly mail: MailService,
    private readonly platform: PlatformRepository,
  ) {}

  private issuer() {
    return process.env.TOTP_ISSUER || 'Maker Dashboard';
  }

  private emptyRecord(): SecurityRecord {
    return {
      email: {
        enabled: false,
        address: null,
        pendingAddress: null,
        pendingCodeHash: null,
        pendingExpiresAt: null,
        enabledAt: null,
      },
      totp: {
        enabled: false,
        secret: null,
        pendingSecret: null,
        enabledAt: null,
      },
      backup: {
        enabled: false,
        hashes: [],
        enabledAt: null,
      },
      loginEmail: {
        codeHash: null,
        expiresAt: null,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private async loadStore(): Promise<Store> {
    if (this.cache) return this.cache;
    const raw = await this.platform.get(NS, STORE_KEY);
    if (raw && typeof raw === 'object' && (raw as any).byUserId) {
      this.cache = {
        byUserId:
          typeof (raw as any).byUserId === 'object'
            ? (raw as any).byUserId
            : {},
      };
    } else {
      this.cache = { byUserId: {} };
    }
    return this.cache;
  }

  private async persistStore(store: Store) {
    this.cache = store;
    await this.platform.set(NS, STORE_KEY, store);
  }

  private async getRecord(userId: string): Promise<SecurityRecord> {
    const store = await this.loadStore();
    const raw = store.byUserId[String(userId)];
    if (!raw) return this.emptyRecord();
    const base = this.emptyRecord();
    return {
      ...base,
      ...raw,
      email: { ...base.email, ...(raw.email || {}) },
      totp: { ...base.totp, ...(raw.totp || {}) },
      backup: { ...base.backup, ...(raw.backup || {}) },
      loginEmail: { ...base.loginEmail, ...(raw.loginEmail || {}) },
    };
  }

  private async saveRecord(userId: string, record: SecurityRecord) {
    const store = await this.loadStore();
    store.byUserId[String(userId)] = {
      ...record,
      updatedAt: new Date().toISOString(),
    };
    await this.persistStore(store);
  }

  private hashCode(code: string) {
    return createHash('sha256')
      .update(`maker-sec:${String(code || '').trim().toUpperCase()}`)
      .digest('hex');
  }

  private hashesEqual(a: string, b: string) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  }

  private normalizeEmail(email: string) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  private maskEmail(email: string) {
    const [user, domain] = email.split('@');
    if (!user || !domain) return '***';
    const visible = user.slice(0, Math.min(2, user.length));
    return `${visible}${'*'.repeat(Math.max(3, user.length - 2))}@${domain}`;
  }

  private sixDigitCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private makeBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = randomBytes(5).toString('hex').toUpperCase();
      codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
    }
    return codes;
  }

  private verifyTotp(secret: string, code: string) {
    const cleaned = String(code || '')
      .replace(/\s+/g, '')
      .trim();
    if (!/^\d{6}$/.test(cleaned)) return false;
    try {
      return authenticator.verify({ token: cleaned, secret });
    } catch {
      return false;
    }
  }

  private consumeBackupCode(record: SecurityRecord, code: string) {
    const hash = this.hashCode(code);
    const idx = record.backup.hashes.findIndex((stored) =>
      this.hashesEqual(stored, hash),
    );
    if (idx < 0) return false;
    record.backup.hashes = record.backup.hashes.filter((_, i) => i !== idx);
    if (!record.backup.hashes.length) {
      record.backup.enabled = false;
    }
    return true;
  }

  private verifyEmailPending(
    hash: string | null,
    expiresAt: string | null,
    code: string,
  ) {
    if (!hash || !expiresAt) return false;
    if (Date.parse(expiresAt) < Date.now()) return false;
    return this.hashesEqual(hash, this.hashCode(code));
  }

  async enabledMethods(userId: string): Promise<SecurityMethod[]> {
    const record = await this.getRecord(userId);
    const methods: SecurityMethod[] = [];
    if (record.email.enabled && record.email.address) methods.push('email');
    if (record.totp.enabled && record.totp.secret) methods.push('totp');
    if (record.backup.enabled && record.backup.hashes.length) {
      methods.push('backup');
    }
    return methods;
  }

  async hasAnyProtection(userId: string) {
    return (await this.enabledMethods(userId)).length > 0;
  }

  async status(userId: string) {
    const record = await this.getRecord(userId);
    return {
      email: {
        enabled: Boolean(record.email.enabled && record.email.address),
        address: record.email.address
          ? this.maskEmail(record.email.address)
          : null,
        enabledAt: record.email.enabledAt,
      },
      totp: {
        enabled: Boolean(record.totp.enabled && record.totp.secret),
        enabledAt: record.totp.enabledAt,
      },
      backup: {
        enabled: Boolean(
          record.backup.enabled && record.backup.hashes.length,
        ),
        remaining: record.backup.hashes.length,
        enabledAt: record.backup.enabledAt,
      },
      methods: await this.enabledMethods(userId),
      mailConfigured: this.mail.isConfigured(),
    };
  }

  async challengeInfo(userId: string) {
    const record = await this.getRecord(userId);
    return {
      methods: await this.enabledMethods(userId),
      maskedEmail:
        record.email.enabled && record.email.address
          ? this.maskEmail(record.email.address)
          : null,
    };
  }

  async startEmailSetup(userId: string, email: string) {
    const address = this.normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      throw new BadRequestException('Invalid email address');
    }

    const code = this.sixDigitCode();
    const record = await this.getRecord(userId);
    record.email.pendingAddress = address;
    record.email.pendingCodeHash = this.hashCode(code);
    record.email.pendingExpiresAt = new Date(
      Date.now() + 10 * 60 * 1000,
    ).toISOString();
    await this.saveRecord(userId, record);

    const send = await this.mail.sendVerificationCode(address, code);
    return {
      ok: true,
      maskedEmail: this.maskEmail(address),
      delivered: send.delivered,
      smtpConfigured: this.mail.isConfigured(),
    };
  }

  async confirmEmailSetup(userId: string, code: string) {
    const record = await this.getRecord(userId);
    if (
      !this.verifyEmailPending(
        record.email.pendingCodeHash,
        record.email.pendingExpiresAt,
        code,
      )
    ) {
      throw new UnauthorizedException('Invalid or expired email code');
    }
    if (!record.email.pendingAddress) {
      throw new BadRequestException('Start email setup first');
    }

    record.email.enabled = true;
    record.email.address = record.email.pendingAddress;
    record.email.pendingAddress = null;
    record.email.pendingCodeHash = null;
    record.email.pendingExpiresAt = null;
    record.email.enabledAt = new Date().toISOString();
    await this.saveRecord(userId, record);
    return { enabled: true, address: this.maskEmail(record.email.address) };
  }

  async disableEmail(userId: string, code: string) {
    const record = await this.getRecord(userId);
    if (!record.email.enabled) {
      throw new BadRequestException('Email protection is not enabled');
    }
    const ok = await this.verifyAnyMethod(userId, code, [
      'email',
      'totp',
      'backup',
    ]);
    if (!ok) throw new UnauthorizedException('Invalid verification code');

    record.email = {
      enabled: false,
      address: null,
      pendingAddress: null,
      pendingCodeHash: null,
      pendingExpiresAt: null,
      enabledAt: null,
    };
    record.loginEmail = { codeHash: null, expiresAt: null };
    await this.saveRecord(userId, record);
    return { enabled: false };
  }

  async beginTotpSetup(userId: string, accountLabel: string) {
    if ((await this.getRecord(userId)).totp.enabled) {
      throw new BadRequestException('Authenticator 2FA is already enabled');
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(
      accountLabel || String(userId),
      this.issuer(),
      secret,
    );
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: { dark: '#0B0B0F', light: '#FFFFFF' },
    });

    const record = await this.getRecord(userId);
    record.totp.pendingSecret = secret;
    await this.saveRecord(userId, record);

    return { secret, otpauthUrl, qrDataUrl };
  }

  async confirmTotpSetup(userId: string, code: string) {
    const record = await this.getRecord(userId);
    if (!record.totp.pendingSecret) {
      throw new BadRequestException('Start authenticator setup first');
    }
    if (!this.verifyTotp(record.totp.pendingSecret, code)) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    record.totp.enabled = true;
    record.totp.secret = record.totp.pendingSecret;
    record.totp.pendingSecret = null;
    record.totp.enabledAt = new Date().toISOString();
    await this.saveRecord(userId, record);
    return { enabled: true };
  }

  async disableTotp(userId: string, code: string) {
    const record = await this.getRecord(userId);
    if (!record.totp.enabled) {
      throw new BadRequestException('Authenticator 2FA is not enabled');
    }
    const ok = await this.verifyAnyMethod(userId, code, [
      'totp',
      'email',
      'backup',
    ]);
    if (!ok) throw new UnauthorizedException('Invalid verification code');

    record.totp = {
      enabled: false,
      secret: null,
      pendingSecret: null,
      enabledAt: null,
    };
    await this.saveRecord(userId, record);
    return { enabled: false };
  }

  async enableBackupCodes(userId: string) {
    const codes = this.makeBackupCodes(10);
    const record = await this.getRecord(userId);
    record.backup = {
      enabled: true,
      hashes: codes.map((c) => this.hashCode(c)),
      enabledAt: new Date().toISOString(),
    };
    await this.saveRecord(userId, record);
    return {
      enabled: true,
      codes,
      remaining: codes.length,
      downloadName: `maker-backup-codes-${userId}.txt`,
    };
  }

  async disableBackup(userId: string, code: string) {
    const record = await this.getRecord(userId);
    if (!record.backup.enabled) {
      throw new BadRequestException('Backup codes are not enabled');
    }
    const ok = await this.verifyAnyMethod(userId, code, [
      'backup',
      'totp',
      'email',
    ]);
    if (!ok) throw new UnauthorizedException('Invalid verification code');

    record.backup = {
      enabled: false,
      hashes: [],
      enabledAt: null,
    };
    await this.saveRecord(userId, record);
    return { enabled: false };
  }

  async sendLoginEmailCode(userId: string) {
    const record = await this.getRecord(userId);
    if (!record.email.enabled || !record.email.address) {
      throw new BadRequestException('Email protection is not enabled');
    }
    const code = this.sixDigitCode();
    record.loginEmail = {
      codeHash: this.hashCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    await this.saveRecord(userId, record);
    const send = await this.mail.sendVerificationCode(
      record.email.address,
      code,
    );
    return {
      ok: true,
      maskedEmail: this.maskEmail(record.email.address),
      delivered: send.delivered,
      smtpConfigured: this.mail.isConfigured(),
    };
  }

  /** Send a code to the protected email (for disable confirmation). */
  async sendEmailActionCode(userId: string) {
    return this.sendLoginEmailCode(userId);
  }

  async verifyAnyMethod(
    userId: string,
    code: string,
    methods: SecurityMethod[],
  ) {
    const record = await this.getRecord(userId);
    const cleaned = String(code || '').trim();
    if (!cleaned) return false;

    for (const method of methods) {
      if (method === 'totp' && record.totp.enabled && record.totp.secret) {
        if (this.verifyTotp(record.totp.secret, cleaned)) return true;
      }
      if (method === 'backup' && record.backup.enabled) {
        if (this.consumeBackupCode(record, cleaned)) {
          await this.saveRecord(userId, record);
          return true;
        }
      }
      if (method === 'email' && record.email.enabled) {
        if (
          this.verifyEmailPending(
            record.loginEmail.codeHash,
            record.loginEmail.expiresAt,
            cleaned,
          )
        ) {
          record.loginEmail = { codeHash: null, expiresAt: null };
          await this.saveRecord(userId, record);
          return true;
        }
        if (
          this.verifyEmailPending(
            record.email.pendingCodeHash,
            record.email.pendingExpiresAt,
            cleaned,
          )
        ) {
          record.email.pendingCodeHash = null;
          record.email.pendingExpiresAt = null;
          await this.saveRecord(userId, record);
          return true;
        }
      }
    }
    return false;
  }

  async verifyLogin(userId: string, method: SecurityMethod, code: string) {
    const methods = await this.enabledMethods(userId);
    if (!methods.includes(method)) {
      throw new BadRequestException('This protection method is not enabled');
    }
    return this.verifyAnyMethod(userId, code, [method]);
  }
}
