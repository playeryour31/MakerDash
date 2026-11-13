export type Locale = 'ar' | 'en';

export const LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'maker-locale';

export function localeDir(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function isLocale(value: unknown): value is Locale {
  return value === 'ar' || value === 'en';
}
