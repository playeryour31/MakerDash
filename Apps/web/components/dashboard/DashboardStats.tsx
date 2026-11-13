'use client';

import type { LucideIcon } from 'lucide-react';
import { Bot, Link2, PlugZap } from 'lucide-react';

export type DashStatItem = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: 'primary' | 'success' | 'cyan';
};

type Props = {
  items: DashStatItem[];
  loading?: boolean;
  'aria-label'?: string;
};

const TONE: Record<
  NonNullable<DashStatItem['tone']>,
  { icon: string; value: string }
> = {
  primary: {
    icon: 'border-primary/25 bg-primary/12 text-brand-soft',
    value: 'text-foreground',
  },
  success: {
    icon: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    value: 'text-emerald-100',
  },
  cyan: {
    icon: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300',
    value: 'text-cyan-100',
  },
};

export function DashboardStats({
  items,
  loading,
  'aria-label': ariaLabel,
}: Props) {
  return (
    <div
      className="bots-hub-stats"
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const tone = TONE[item.tone || 'primary'];
        return (
          <div key={item.label} className="bots-hub-stat">
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}
            >
              <Icon size={17} strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0">
              <p
                className={`font-display text-2xl font-bold tabular-nums tracking-tight leading-none ${tone.value}`}
              >
                {item.value}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold leading-snug text-muted-foreground">
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const DASH_STAT_ICONS = {
  bots: Bot,
  online: PlugZap,
  linked: Link2,
} as const;
