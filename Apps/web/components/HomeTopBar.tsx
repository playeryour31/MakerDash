'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogIn } from 'lucide-react';
import BrandMark from './BrandMark';
import LanguageSwitcher from './LanguageSwitcher';
import { discordLoginUrl, getToken } from '@/lib/api';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function HomeTopBar() {
  const { t } = useI18n();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getToken());
  }, []);

  return (
    <header className="home-topbar">
      <div className="home-topbar-inner">
        <Link href="/" className="home-topbar-brand">
          <BrandMark size={34} />
          <div className="home-topbar-brand-copy">
            <p className="home-topbar-brand-title">{t.common.maker}</p>
            <p className="home-topbar-brand-sub">{t.home.tagline}</p>
          </div>
        </Link>

        <div className="home-topbar-actions">
          <LanguageSwitcher size="sm" />
          {loggedIn ? (
            <Link href="/dashboard" className="home-topbar-cta home-topbar-cta-dash ui-press">
              {t.home.openDashboard}
            </Link>
          ) : (
            <a href={discordLoginUrl()} className="home-topbar-cta home-login-cta ui-press">
              <LogIn size={15} strokeWidth={1.85} aria-hidden />
              <span>{t.home.login}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
