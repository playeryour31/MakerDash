import { Injectable, Logger } from '@nestjs/common';
import { config as loadEnv } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private envLoaded = false;

  /** Reload Apps/api/.env if SMTP vars were added after process start. */
  private ensureSmtpEnv() {
    if (this.envLoaded) return;

    const candidates = [
      path.resolve(__dirname, '../../.env'),
      path.resolve(process.cwd(), 'Apps/api/.env'),
      path.join(process.env.MAKER_ROOT || '', 'Apps', 'api', '.env'),
    ];

    for (const file of candidates) {
      if (!file || !fs.existsSync(file)) continue;
      loadEnv({ path: file, override: false });
      break;
    }

    this.envLoaded = true;
  }

  private env(name: string) {
    return String(process.env[name] || '').trim();
  }

  private from() {
    return (
      this.env('SMTP_FROM') ||
      this.env('EMAIL_FROM') ||
      this.env('SMTP_USER') ||
      'Maker <noreply@maker.local>'
    );
  }

  isConfigured() {
    this.ensureSmtpEnv();
    return Boolean(
      this.env('SMTP_HOST') && this.env('SMTP_USER') && this.env('SMTP_PASS'),
    );
  }

  status() {
    return {
      configured: this.isConfigured(),
      host: this.env('SMTP_HOST') || null,
      from: this.from(),
    };
  }

  async sendVerificationCode(to: string, code: string, localeHint?: string) {
    this.ensureSmtpEnv();

    const ar = !localeHint || localeHint.startsWith('ar');
    const subject = ar
      ? 'رمز التحقق — Maker'
      : 'Verification code — Maker';
    const text = ar
      ? `رمز التحقق الخاص بك في Maker هو: ${code}\nصالح لمدة 10 دقائق.\nإذا لم تطلب هذا الرمز فتجاهل الرسالة.`
      : `Your Maker verification code is: ${code}\nIt expires in 10 minutes.\nIf you did not request this, ignore this email.`;
    const html = `
      <div style="font-family:Segoe UI,Tahoma,sans-serif;background:#0B0B0F;color:#f5f5f7;padding:28px">
        <div style="max-width:440px;margin:0 auto;background:#101018;border:1px solid #2a2a36;border-radius:16px;padding:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa">${ar ? 'Maker — حماية الحساب' : 'Maker — Account security'}</p>
          <h1 style="margin:0 0 16px;font-size:22px">${ar ? 'رمز التحقق' : 'Verification code'}</h1>
          <p style="margin:0 0 18px;font-size:14px;color:#c4c4cc;line-height:1.6">
            ${ar ? 'استخدم الرمز التالي لإكمال التحقق:' : 'Use this code to finish verification:'}
          </p>
          <p style="margin:0;letter-spacing:0.35em;font-size:28px;font-weight:700;text-align:center;background:#1a1230;border:1px solid #5B21B6;border-radius:12px;padding:14px 10px;color:#fff">${code}</p>
          <p style="margin:18px 0 0;font-size:12px;color:#71717a">${ar ? 'صالح لمدة 10 دقائق.' : 'Expires in 10 minutes.'}</p>
        </div>
      </div>
    `;

    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP not configured — verification code for ${to}: ${code}`,
      );
      return { delivered: false, logged: true };
    }

    const host = this.env('SMTP_HOST');
    const port = Number(this.env('SMTP_PORT') || 587);
    const user = this.env('SMTP_USER');
    const pass = this.env('SMTP_PASS');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465 || this.env('SMTP_SECURE') === 'true',
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({
        from: this.from(),
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Verification email sent to ${to} via ${host}`);
      return { delivered: true, logged: false };
    } catch (err: any) {
      this.logger.error(
        `Failed to send email via ${host}: ${err?.message || err}`,
      );
      this.logger.warn(`Fallback code for ${to}: ${code}`);
      throw err;
    }
  }
}
