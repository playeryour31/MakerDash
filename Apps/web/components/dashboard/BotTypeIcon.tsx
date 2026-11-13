'use client';

import type { CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BOT_TYPE_ACCENTS,
  getBotTypeConfig,
  type BotTypeAccent,
} from '@/lib/botTypeConfig';

type Props = {
  type?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE: Record<NonNullable<Props['size']>, { box: string; icon: number }> = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 16 },
  md: { box: 'h-11 w-11 rounded-xl', icon: 22 },
  lg: { box: 'h-12 w-12 rounded-2xl', icon: 26 },
};

export function BotTypeIcon({ type, size = 'md', className = '' }: Props) {
  const config = getBotTypeConfig(type);
  const Icon = config.icon;
  const tones = BOT_TYPE_ACCENTS[config.accent];
  const dim = SIZE[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border ${dim.box} ${className}`}
      style={
        {
          color: tones.accent,
          background: tones.soft,
          borderColor: tones.border,
        } as CSSProperties
      }
      data-accent={config.accent}
    >
      <Icon size={dim.icon} strokeWidth={1.75} aria-hidden />
    </span>
  );
}

export function BotTypeBadge({
  label,
  accent,
  icon: Icon,
}: {
  label: string;
  accent: BotTypeAccent;
  icon?: LucideIcon;
}) {
  const tones = BOT_TYPE_ACCENTS[accent];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-bold"
      style={
        {
          color: tones.accent,
          background: tones.soft,
          borderColor: tones.border,
        } as CSSProperties
      }
    >
      {Icon ? <Icon size={12} strokeWidth={1.85} aria-hidden /> : null}
      {label}
    </span>
  );
}
