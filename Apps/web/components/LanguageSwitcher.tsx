'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/I18nProvider';

type Props = {
  /** denser control for tight toolbars */
  size?: 'sm' | 'md';
  /** stretch to full width (sidebar footer) */
  fullWidth?: boolean;
  className?: string;
};

export default function LanguageSwitcher({
  size = 'md',
  fullWidth = false,
  className = '',
}: Props) {
  const { locale, setLocale, t } = useI18n();
  const sm = size === 'sm';

  return (
    <div
      className={[
        'lang-switch',
        sm ? 'lang-switch-sm' : '',
        fullWidth ? 'lang-switch-block' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={t.common.language}
    >
      <span className="lang-switch-icon" aria-hidden>
        <Languages size={sm ? 14 : 15} strokeWidth={1.75} />
      </span>

      <div className="lang-switch-track">
        <span
          className={`lang-switch-thumb ${locale === 'en' ? 'is-en' : 'is-ar'}`}
          aria-hidden
        />
        <button
          type="button"
          className={`lang-switch-opt ${locale === 'ar' ? 'is-active' : ''}`}
          aria-pressed={locale === 'ar'}
          onClick={() => setLocale('ar')}
        >
          {t.common.arabic}
        </button>
        <button
          type="button"
          className={`lang-switch-opt ${locale === 'en' ? 'is-active' : ''}`}
          aria-pressed={locale === 'en'}
          onClick={() => setLocale('en')}
        >
          {t.common.english}
        </button>
      </div>
    </div>
  );
}
