'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, LogOut, UserRound } from 'lucide-react';
import BrandMark from './BrandMark';
import { ApiError, api, clearToken, hasSession } from '@/lib/api';

type Me = {
  id: string;
  username?: string;
  avatar?: string | null;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/dashboard' || pathname === '/dashboard/';
  const isProfile =
    pathname === '/dashboard/profile' || pathname.startsWith('/dashboard/profile/');
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!hasSession()) return;
    let cancelled = false;
    api<Me>('/auth/me')
      .then((user) => {
        if (!cancelled) setMe(user);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          clearToken();
          setMe(null);
          router.replace('/');
          return;
        }
        setMe(null);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const avatarUrl =
    me?.id && me?.avatar
      ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64`
      : null;

  return (
    <aside className="dash-sidebar hidden lg:flex">
      <div className="dash-sidebar-glow" aria-hidden />

      <div className="relative px-5 pb-5 pt-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="dash-sidebar-logo">
            <BrandMark size={36} />
          </span>
          <div>
            <p className="font-display text-[15px] font-semibold tracking-tight">
              Volyx Maker
            </p>
            <p className="text-[11px] text-muted-foreground">لوحة تحكم المشتري</p>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-2">
        <p className="dash-nav-label">القائمة</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <Link
          href="/dashboard"
          className={`dash-nav-link ${isRoot ? 'dash-nav-link-active' : ''}`}
        >
          <span className={`dash-nav-icon ${isRoot ? 'dash-nav-icon-active' : ''}`}>
            <LayoutGrid size={16} />
          </span>
          <span className="flex-1">بوتاتي</span>
          {isRoot ? <span className="dash-nav-dot" /> : null}
        </Link>
        <Link
          href="/dashboard/profile"
          className={`dash-nav-link ${isProfile ? 'dash-nav-link-active' : ''}`}
        >
          <span className={`dash-nav-icon ${isProfile ? 'dash-nav-icon-active' : ''}`}>
            <UserRound size={16} />
          </span>
          <span className="flex-1">الملف الشخصي</span>
          {isProfile ? <span className="dash-nav-dot" /> : null}
        </Link>
      </nav>

      <div className="relative border-t border-border/80 p-3">
        {me ? (
          <Link href="/dashboard/profile" className="dash-user-card mb-2 block transition hover:border-primary/40">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {(me.username || '?').slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{me.username || me.id}</p>
              <p className="truncate font-mono text-[10px] text-muted-foreground">
                {me.id}
              </p>
            </div>
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            clearToken();
            router.push('/');
          }}
          className="dash-nav-link dash-nav-link-danger w-full"
        >
          <span className="dash-nav-icon">
            <LogOut size={16} />
          </span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
