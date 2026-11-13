'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, LogOut, UserRound } from 'lucide-react';
import BrandMark from './BrandMark';
import LanguageSwitcher from './LanguageSwitcher';
import { clearToken } from '@/lib/api';
import { useMe } from '@/hooks/useAuthData';
import { useI18n } from '@/lib/i18n/I18nProvider';

export default function DashboardTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { me } = useMe();

  const isBots = pathname === '/dashboard' || pathname === '/dashboard/';
  const isProfile =
    pathname === '/dashboard/profile' ||
    pathname.startsWith('/dashboard/profile/');

  const avatarUrl =
    me?.id && me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
      : null;

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-inner dash-topbar-inner-grid">
        <Link href="/dashboard" className="dash-topbar-brand">
          <span className="dash-topbar-brand-mark">
            <BrandMark size={34} />
          </span>
          <div className="dash-topbar-brand-copy">
            <p className="dash-topbar-brand-title">{t.common.maker}</p>
            <p className="dash-topbar-brand-sub">{t.nav.buyerPanel}</p>
          </div>
        </Link>

        <nav className="dash-topbar-nav" aria-label={t.nav.buyerPanel}>
          <Link
            href="/dashboard"
            className={`dash-topbar-link ${isBots ? 'is-active' : ''}`}
            aria-current={isBots ? 'page' : undefined}
          >
            <LayoutGrid size={15} strokeWidth={1.85} aria-hidden />
            <span>{t.nav.myBots}</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className={`dash-topbar-link ${isProfile ? 'is-active' : ''}`}
            aria-current={isProfile ? 'page' : undefined}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="dash-topbar-avatar" />
            ) : (
              <UserRound size={15} strokeWidth={1.85} aria-hidden />
            )}
            <span>{t.nav.profile}</span>
          </Link>
        </nav>

        <div className="dash-topbar-tools">
          <LanguageSwitcher size="sm" />
          <button
            type="button"
            className="dash-topbar-logout"
            onClick={() => {
              clearToken();
              router.push('/');
            }}
          >
            <LogOut size={15} strokeWidth={1.85} aria-hidden />
            <span>{t.common.logout}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
