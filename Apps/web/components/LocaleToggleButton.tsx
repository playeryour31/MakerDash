'use client';

import type { MouseEvent } from 'react';
import { useI18n } from '@/lib/i18n/I18nProvider';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

export default function LocaleToggleButton({
  className = '',
  size = 'md',
}: Props) {
  const { locale, toggleLocale, t } = useI18n();

  const onToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleLocale();
  };

  return (
    <button
      type="button"
      className={[
        'locale-chip',
        size === 'sm' ? 'locale-chip-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onToggle}
      aria-label={t.common.language}
      title={locale === 'en' ? t.common.arabic : t.common.english}
    >
      {locale === 'en' ? 'EN' : 'ع'}
    </button>
  );
}
