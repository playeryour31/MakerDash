'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { ApiError, api, markSession, setToken } from '@/lib/api';
import AmbientBackground from '@/components/AmbientBackground';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useI18n } from '@/lib/i18n/I18nProvider';
import type { SecurityMethod } from '@/hooks/useAuthData';

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { t } = useI18n();
  const token = search.get('token');
  const pending = search.get('pending');
  const nextParam = search.get('next') || '/dashboard';
  const methodsParam = search.get('methods') || '';
  const maskedEmail = search.get('email');

  const methods = useMemo(() => {
    const list = methodsParam
      .split(',')
      .map((m) => m.trim())
      .filter((m): m is SecurityMethod =>
        m === 'email' || m === 'totp' || m === 'backup',
      );
    return list.length ? list : (['totp'] as SecurityMethod[]);
  }, [methodsParam]);

  const [method, setMethod] = useState<SecurityMethod | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (pending) {
      setMethod(methods.length === 1 ? methods[0] : null);
      return;
    }
    let cancelled = false;
    const target = nextParam.startsWith('/') ? nextParam : '/dashboard';

    // Old magic links may still carry ?token=…; new logins arrive with an
    // HttpOnly session cookie and no token in the URL.
    if (token) {
      setToken(token);
      router.replace(target);
      return;
    }

    (async () => {
      try {
        await api('/auth/me');
        if (cancelled) return;
        markSession();
        router.replace(target);
      } catch {
        if (!cancelled) router.replace('/?error=oauth_failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, token, pending, nextParam, methods]);

  async function sendEmailCode() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{
        maskedEmail: string;
        smtpConfigured: boolean;
      }>('/auth/security/challenge/send-email', {
        method: 'POST',
        body: JSON.stringify({ pendingToken: pending }),
      });
      setEmailSent(true);
      setError(null);
      // soft success via clearing error; show hint in UI
      if (!res.smtpConfigured) {
        setError(t.profile.security.emailLoggedDev.replace('{email}', res.maskedEmail));
      }
    } catch (err) {
      setError(parseErr(err, t.profile.security.emailFailed));
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pending || !method) return;
    if (!code.trim()) {
      setError(t.profile.security.invalidCode);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ next?: string }>(
        '/auth/security/challenge/verify',
        {
          method: 'POST',
          body: JSON.stringify({
            pendingToken: pending,
            method,
            code: code.trim(),
          }),
        },
      );
      // The API sets the HttpOnly session cookie on this response.
      markSession();
      const next =
        result.next && result.next.startsWith('/')
          ? result.next
          : nextParam.startsWith('/')
            ? nextParam
            : '/dashboard';
      router.replace(next);
    } catch (err) {
      setError(parseErr(err, t.profile.security.verifyFailed));
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    const methodLabel = (m: SecurityMethod) => {
      if (m === 'email') return t.profile.security.methodEmail;
      if (m === 'backup') return t.profile.security.methodBackup;
      return t.profile.security.methodTotp;
    };

    return (
      <div className="auth-2fa-card relative z-10">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher size="sm" />
        </div>
        <div className="mb-5 flex items-center gap-3">
          <span className="profile-section-icon">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">
              {t.profile.security.challengeTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.profile.security.challengeBody}
            </p>
          </div>
        </div>

        {methods.length > 1 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted-foreground">
              {t.profile.security.chooseMethod}
            </p>
            <div className="flex flex-col gap-2">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`auth-method-btn ${method === m ? 'is-active' : ''}`}
                  onClick={() => {
                    setMethod(m);
                    setCode('');
                    setError(null);
                    setEmailSent(false);
                  }}
                >
                  {m === 'email' ? (
                    <Mail size={15} />
                  ) : (
                    <KeyRound size={15} />
                  )}
                  <span>
                    {methodLabel(m)}
                    {m === 'email' && maskedEmail ? (
                      <span className="ms-1 opacity-70" dir="ltr">
                        ({maskedEmail})
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {method ? (
          <form onSubmit={submit} className="space-y-4">
            {methods.length === 1 ? (
              <p className="text-sm font-medium">{methodLabel(method)}</p>
            ) : null}

            {method === 'email' ? (
              <button
                type="button"
                className="profile-btn-ghost"
                disabled={busy}
                onClick={sendEmailCode}
              >
                {busy && !emailSent ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Mail size={14} />
                )}
                {t.profile.security.sendEmailCode}
              </button>
            ) : null}

            <label className="block">
              <span className="text-xs text-muted-foreground">
                {t.profile.security.codeLabel}
              </span>
              <input
                className="profile-code-input"
                inputMode={method === 'backup' ? 'text' : 'numeric'}
                autoComplete="one-time-code"
                autoFocus
                maxLength={12}
                placeholder={method === 'backup' ? 'XXXX-XXXXXX' : '000000'}
                value={code}
                dir="ltr"
                onChange={(e) => setCode(e.target.value.trim().slice(0, 12))}
              />
            </label>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="profile-btn-primary w-full justify-center"
              disabled={busy || !code}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : null}
              {t.profile.security.verifyContinue}
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-4">
      <LanguageSwitcher size="sm" />
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin text-primary" />
        {t.common.completingLogin}
      </p>
    </div>
  );
}

function parseErr(err: unknown, fallback: string) {
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

export default function AuthCallbackPage() {
  const { t } = useI18n();
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <AmbientBackground />
      <Suspense
        fallback={
          <p className="relative z-10 text-sm text-muted-foreground">
            {t.common.loading}
          </p>
        }
      >
        <CallbackInner />
      </Suspense>
    </main>
  );
}
