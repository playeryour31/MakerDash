'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  loading?: boolean;
  empty?: ReactNode;
  className?: string;
};

export function BotGrid({ children, loading, empty, className = '' }: Props) {
  return (
    <section
      className={`relative z-[1] grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 ${className}`}
      aria-busy={loading || undefined}
    >
      {children}
      {empty}
    </section>
  );
}
