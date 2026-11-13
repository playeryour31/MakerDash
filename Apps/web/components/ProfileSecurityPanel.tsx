'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  ShieldOff,
  Smartphone,
} from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { MeUser, SecurityStatus } from '@/hooks/useAuthData';

type TotpSetup = {
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
};

type Props = {
  me: MeUser;
  onChanged: () => void | Promise<unknown>;
};

export default function ProfileSecurityPanel({ me, onChanged }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const s = t.profile.security;
  const security: SecurityStatus = {
    email: {
      enabled: Boolean(me.security?.email?.enabled),
      address: me.security?.email?.address ?? null,
      enabledAt: me.security?.email?.enabledAt ?? null,
    },
    totp: {
      enabled: Boolean(me.security?.totp?.enabled),
      enabledAt: me.security?.totp?.enabledAt ?? null,
    },
    backup: {
      enabled: Boolean(me.security?.backup?.enabled),
      remaining: me.security?.backup?.remaining ?? 0,
      enabledAt: me.security?.backup?.enabledAt ?? null,
    },
    methods: me.security?.methods ?? [],
    mailConfigured: Boolean(me.security?.mailConfigured),
  };

  const [busy, setBusy] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailStep, setEmailStep] = useState<'idle' | 'code' | 'disable'>('idle');
  const [emailCode, setEmailCode] = useState('');
  const [totpStep, setTotpStep] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [backupStep, setBackupStep] = useState<'idle' | 'codes' | 'disable'>('idle');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCode, setBackupCode] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const enabledCount = useMemo(
    () =>
      [security.email.enabled, security.totp.enabled, security.backup.enabled].filter(
        Boolean,
      ).length,
    [security],
  );

  async function refresh() {
    await onChanged();
  }

  function errMsg(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      try {
        const json = JSON.parse(err.body);
        if (typeof json?.message === 'string') return json.message;
        if (Array.isArray(json?.message)) return json.message.join(', ');
      } catch {
        /* ignore */
      }
    }
    return fallback;
  }

  function downloadCodes(codes: string[], filename: string) {
    const body = [
      'Volyx Maker — Backup Codes',
      'Keep these codes safe. Each code works once.',
      '',
      ...codes,
      '',
    ].join('\n');
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---- Email ---- */
  async function startEmail() {
    if (!emailInput.trim()) {
      toast.error(s.emailInvalid);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{
        maskedEmail: string;
        smtpConfigured: boolean;
      }>('/auth/security/email/start', {
        method: 'POST',
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      setEmailStep('code');
      setEmailCode('');
      toast.success(
        res.smtpConfigured
          ? s.emailSent.replace('{email}', res.maskedEmail)
          : s.emailLoggedDev.replace('{email}', res.maskedEmail),
      );
    } catch (err) {
      toast.error(errMsg(err, s.emailFailed));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEmail() {
    setBusy(true);
    try {
      await api('/auth/security/email/confirm', {
        method: 'POST',
        body: JSON.stringify({ code: emailCode.trim() }),
      });
      setEmailStep('idle');
      setEmailCode('');
      setEmailInput('');
      await refresh();
      toast.success(s.emailEnabled);
    } catch (err) {
      toast.error(errMsg(err, s.invalidCode));
    } finally {
      setBusy(false);
    }
  }

  async function sendDisableEmailCode() {
    setBusy(true);
    try {
      const res = await api<{ maskedEmail: string; smtpConfigured: boolean }>(
        '/auth/security/email/send-code',
        { method: 'POST', body: '{}' },
      );
      toast.success(
        res.smtpConfigured
          ? s.emailSent.replace('{email}', res.maskedEmail)
          : s.emailLoggedDev.replace('{email}', res.maskedEmail),
      );
    } catch (err) {
      toast.error(errMsg(err, s.emailFailed));
    } finally {
      setBusy(false);
    }
  }

  async function disableEmail() {
    setBusy(true);
    try {
      await api('/auth/security/email/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      setEmailStep('idle');
      setDisableCode('');
      await refresh();
      toast.success(s.emailDisabled);
    } catch (err) {
      toast.error(errMsg(err, s.invalidCode));
    } finally {
      setBusy(false);
    }
  }

  /* ---- TOTP ---- */
  async function startTotp() {
    setBusy(true);
    try {
      const data = await api<TotpSetup>('/auth/security/totp/setup', {
        method: 'POST',
        body: '{}',
      });
      setTotpSetup(data);
      setTotpCode('');
      setTotpStep('setup');
    } catch (err) {
      toast.error(errMsg(err, s.setupFailed));
    } finally {
      setBusy(false);
    }
  }

  async function confirmTotp() {
    setBusy(true);
    try {
      await api('/auth/security/totp/enable', {
        method: 'POST',
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      setTotpStep('idle');
      setTotpSetup(null);
      setTotpCode('');
      await refresh();
      toast.success(s.enabledSuccess);
    } catch (err) {
      toast.error(errMsg(err, s.enableFailed));
    } finally {
      setBusy(false);
    }
  }

  async function disableTotp() {
    setBusy(true);
    try {
      await api('/auth/security/totp/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode.trim() }),
      });
      setTotpStep('idle');
      setDisableCode('');
      await refresh();
      toast.success(s.disabledSuccess);
    } catch (err) {
      toast.error(errMsg(err, s.disableFailed));
    } finally {
      setBusy(false);
    }
  }

  /* ---- Backup ---- */
  async function generateBackup() {
    setBusy(true);
    try {
      const data = await api<{
        codes: string[];
        downloadName: string;
      }>('/auth/security/backup/generate', {
        method: 'POST',
        body: '{}',
      });
      setBackupCodes(data.codes || []);
      setBackupStep('codes');
      downloadCodes(data.codes || [], data.downloadName || 'maker-backup-codes.txt');
      await refresh();
      toast.success(s.backupGenerated);
    } catch (err) {
      toast.error(errMsg(err, s.backupFailed));
    } finally {
      setBusy(false);
    }
  }

  async function disableBackup() {
    setBusy(true);
    try {
      await api('/auth/security/backup/disable', {
        method: 'POST',
        body: JSON.stringify({ code: backupCode.trim() || disableCode.trim() }),
      });
      setBackupStep('idle');
      setBackupCode('');
      setDisableCode('');
      await refresh();
      toast.success(s.backupDisabled);
    } catch (err) {
      toast.error(errMsg(err, s.disableFailed));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-panel profile-security-section" id="security">
      <div className="profile-security-head">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold sm:text-xl">
            <span className="profile-section-icon">
              <ShieldCheck size={16} />
            </span>
            {s.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {s.subtitleFull}
          </p>
        </div>
        <span className="profile-security-badge is-count">
          {s.enabledCount.replace('{count}', String(enabledCount))}
        </span>
      </div>

      <div className="profile-security-grid">
        {/* 1. Email */}
        <article className="profile-sec-card">
          <div className="profile-sec-card-top">
            <span className="profile-section-icon">
              <Mail size={16} />
            </span>
            <span
              className={`profile-security-badge ${
                security.email.enabled ? 'is-on' : 'is-off'
              }`}
            >
              {security.email.enabled
                ? s.on
                : s.off}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold">{s.emailTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {s.emailBody}
          </p>
          {security.email.enabled && security.email.address ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground" dir="ltr">
              {security.email.address}
            </p>
          ) : null}

          {emailStep === 'idle' && !security.email.enabled ? (
            <div className="mt-4 space-y-2">
              <input
                className="profile-text-input"
                type="email"
                dir="ltr"
                placeholder="you@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <button
                type="button"
                className="profile-btn-primary"
                disabled={busy}
                onClick={startEmail}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                {s.emailEnable}
              </button>
            </div>
          ) : null}

          {emailStep === 'code' ? (
            <div className="mt-4 space-y-2">
              <input
                className="profile-code-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                dir="ltr"
                value={emailCode}
                onChange={(e) =>
                  setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-primary"
                  disabled={busy || emailCode.length !== 6}
                  onClick={confirmEmail}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.confirmEnable}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => setEmailStep('idle')}
                >
                  {t.common.discard}
                </button>
              </div>
            </div>
          ) : null}

          {security.email.enabled && emailStep === 'idle' ? (
            <button
              type="button"
              className="profile-btn-danger mt-4"
              onClick={() => {
                setDisableCode('');
                setEmailStep('disable');
              }}
            >
              <ShieldOff size={14} />
              {s.disable}
            </button>
          ) : null}

          {emailStep === 'disable' ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                {s.disableAnyHint}
              </p>
              <button
                type="button"
                className="profile-btn-ghost"
                disabled={busy}
                onClick={sendDisableEmailCode}
              >
                {s.resendEmailCode}
              </button>
              <input
                className="profile-code-input"
                dir="ltr"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.trim().slice(0, 12))}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-danger"
                  disabled={busy || !disableCode}
                  onClick={disableEmail}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.confirmDisable}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => setEmailStep('idle')}
                >
                  {t.common.discard}
                </button>
              </div>
            </div>
          ) : null}
        </article>

        {/* 2. TOTP */}
        <article className="profile-sec-card">
          <div className="profile-sec-card-top">
            <span className="profile-section-icon">
              <Smartphone size={16} />
            </span>
            <span
              className={`profile-security-badge ${
                security.totp.enabled ? 'is-on' : 'is-off'
              }`}
            >
              {security.totp.enabled
                ? s.on
                : s.off}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold">{s.totpTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {security.totp.enabled
              ? s.totpEnabledBody
              : s.totpDisabledBody}
          </p>

          {totpStep === 'idle' && !security.totp.enabled ? (
            <button
              type="button"
              className="profile-btn-primary mt-4"
              disabled={busy}
              onClick={startTotp}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {s.enable}
            </button>
          ) : null}

          {totpStep === 'setup' && totpSetup ? (
            <div className="mt-4 space-y-3">
              <div className="profile-2fa-qr-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={totpSetup.qrDataUrl} alt="" className="profile-2fa-qr" />
              </div>
              <code className="profile-mono block" dir="ltr">
                {totpSetup.secret}
              </code>
              <input
                className="profile-code-input"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                dir="ltr"
                value={totpCode}
                onChange={(e) =>
                  setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-primary"
                  disabled={busy || totpCode.length !== 6}
                  onClick={confirmTotp}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.confirmEnable}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => {
                    setTotpStep('idle');
                    setTotpSetup(null);
                  }}
                >
                  {t.common.discard}
                </button>
              </div>
            </div>
          ) : null}

          {security.totp.enabled && totpStep === 'idle' ? (
            <button
              type="button"
              className="profile-btn-danger mt-4"
              onClick={() => {
                setDisableCode('');
                setTotpStep('disable');
              }}
            >
              <ShieldOff size={14} />
              {s.disable}
            </button>
          ) : null}

          {totpStep === 'disable' ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                {s.disableAnyHint}
              </p>
              <input
                className="profile-code-input"
                dir="ltr"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.trim().slice(0, 12))}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-danger"
                  disabled={busy || !disableCode}
                  onClick={disableTotp}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.confirmDisable}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => setTotpStep('idle')}
                >
                  {t.common.discard}
                </button>
              </div>
            </div>
          ) : null}
        </article>

        {/* 3. Backup codes */}
        <article className="profile-sec-card">
          <div className="profile-sec-card-top">
            <span className="profile-section-icon">
              <Download size={16} />
            </span>
            <span
              className={`profile-security-badge ${
                security.backup.enabled ? 'is-on' : 'is-off'
              }`}
            >
              {security.backup.enabled
                ? s.on
                : s.off}
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold">
            {s.backupTitle}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {s.backupBody}
          </p>
          {security.backup.enabled ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {s.recoveryLeft.replace(
                '{count}',
                String(security.backup.remaining),
              )}
            </p>
          ) : null}

          {backupStep === 'idle' ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="profile-btn-primary"
                disabled={busy}
                onClick={generateBackup}
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {security.backup.enabled
                  ? s.backupRegenerate
                  : s.backupEnable}
              </button>
              {security.backup.enabled ? (
                <button
                  type="button"
                  className="profile-btn-danger"
                  onClick={() => {
                    setBackupCode('');
                    setBackupStep('disable');
                  }}
                >
                  <ShieldOff size={14} />
                  {s.disable}
                </button>
              ) : null}
            </div>
          ) : null}

          {backupStep === 'codes' ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                {s.recoveryBody}
              </p>
              <ul className="profile-recovery-grid" dir="ltr">
                {backupCodes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-primary"
                  onClick={() =>
                    downloadCodes(backupCodes, 'maker-backup-codes.txt')
                  }
                >
                  <Download size={14} />
                  {s.downloadBackup}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(backupCodes.join('\n'));
                      toast.success(t.profile.copied);
                    } catch {
                      toast.error(t.profile.copyFailed);
                    }
                  }}
                >
                  <Copy size={14} />
                  {s.copyRecovery}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => {
                    setBackupCodes([]);
                    setBackupStep('idle');
                  }}
                >
                  <Check size={14} />
                  {s.done}
                </button>
              </div>
            </div>
          ) : null}

          {backupStep === 'disable' ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                {s.disableAnyHint}
              </p>
              <input
                className="profile-code-input"
                dir="ltr"
                placeholder="XXXX-XXXXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.trim().slice(0, 12))}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="profile-btn-danger"
                  disabled={busy || !backupCode}
                  onClick={disableBackup}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                  {s.confirmDisable}
                </button>
                <button
                  type="button"
                  className="profile-btn-ghost"
                  onClick={() => setBackupStep('idle')}
                >
                  {t.common.discard}
                </button>
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
