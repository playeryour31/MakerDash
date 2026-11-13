'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import HomeTopBar from '@/components/HomeTopBar';
import { clearToken, discordLoginUrl, hasSession } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';
import './home-landing.css';

const BARS = [38, 62, 46, 78, 55, 90, 70];

export default function HomeClient() {
  const router = useRouter();
  const search = useSearchParams();
  const { t, locale } = useI18n();
  const errorKey = search.get('error') || '';

  const errorMsg = useMemo(() => {
    if (!errorKey) return '';
    const map: Record<string, string> = {
      owner_mismatch: t.errors.ownerMismatch,
      invalid_link: t.errors.invalidLink,
      oauth_denied: t.errors.oauthDenied,
      oauth_failed: t.errors.oauthFailed,
      invalid_admin_invite: t.errors.invalidAdminInvite,
      oauth_state_invalid: t.errors.oauthStateInvalid,
    };
    return map[errorKey] || t.errors.generic;
  }, [errorKey, t]);

  useEffect(() => {
    if (errorKey) {
      clearToken();
      return;
    }
    if (hasSession()) router.replace('/dashboard');
  }, [router, errorKey]);

  return (
    <div className="lp-shell" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <HomeTopBar />

      <main className="lp-main">
        {/* Copy column: aligned to the start edge, not centered */}
        <section className="lp-copy">
          <div className="lp-brand lp-enter lp-enter-1">
            <BrandMark size={56} />
            <div>
              <p className="lp-brand-name">{t.common.maker}</p>
              <p className="lp-brand-tag">{t.home.tagline}</p>
            </div>
          </div>

          <h1 className="lp-headline lp-enter lp-enter-2">
            <span>{t.home.headline}</span>
            <span className="lp-headline-2">{t.home.headlineAccent}</span>
          </h1>

          <p className="lp-support lp-enter lp-enter-3">{t.home.support}</p>

          {errorMsg ? (
            <p role="alert" className="lp-error lp-enter lp-enter-3">
              {errorMsg}
            </p>
          ) : null}

          <div className="lp-cta-row lp-enter lp-enter-4">
            <a href={discordLoginUrl()} className="lp-cta">
              <LogIn size={18} strokeWidth={1.75} />
              <span>{t.home.loginDiscord}</span>
              <span className="lp-cta-chip" aria-hidden>
                <ShieldCheck size={14} strokeWidth={1.75} />
              </span>
            </a>
            <p className="lp-signal">
              <span className="lp-signal-dot" aria-hidden />
              {t.home.signal}
            </p>
          </div>
        </section>

        {/* Preview column: a dashboard mock that bleeds off the inline-end edge */}
        <div className="lp-stage" aria-hidden>
          <div className="lp-window">
            <div className="lp-window-bar">
              <span /><span /><span />
              <span className="lp-pill" style={{ width: 120 }} />
            </div>
            <div className="lp-window-body">
              <aside className="lp-rail">
                {[0, 1, 2, 3, 4].map((n) => (
                  <span key={n} className={n === 1 ? 'lp-rail-dot is-on' : 'lp-rail-dot'} />
                ))}
              </aside>

              <div className="lp-panel">
                <div className="lp-panel-head">
                  <span className="lp-pill" style={{ width: 150, height: 12 }} />
                  <span className="lp-pill is-accent" style={{ width: 56 }} />
                </div>

                <div className="lp-chart">
                  {BARS.map((h, i) => (
                    <span key={i} style={{ height: `${h}%`, animationDelay: `${0.5 + i * 0.06}s` }} />
                  ))}
                </div>

                {[0, 1, 2].map((n) => (
                  <div className="lp-row" key={n}>
                    <span className="lp-row-icon" />
                    <span className="lp-row-lines">
                      <span className="lp-pill" style={{ width: `${60 - n * 12}%` }} />
                      <span className="lp-pill is-dim" style={{ width: `${82 - n * 10}%` }} />
                    </span>
                    <span className={n === 2 ? 'lp-switch' : 'lp-switch is-on'} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lp-float">
            <span className="lp-float-dot" />
            <span className="lp-pill" style={{ width: 84 }} />
          </div>
        </div>
      </main>
    </div>
  );
}
