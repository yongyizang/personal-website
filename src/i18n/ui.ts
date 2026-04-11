import en from './en.json';
import zh from './zh.json';

const translations = { en, zh } as const;
export type Locale = keyof typeof translations;
export const locales: Locale[] = ['en', 'zh'];
export const defaultLocale: Locale = 'en';

export function t(locale: Locale, key: keyof typeof en): string {
  return (translations[locale] as Record<string, string>)[key] ?? (translations['en'] as Record<string, string>)[key] ?? key;
}

export function getLocaleFromUrl(url: URL): Locale {
  const [, locale] = url.pathname.split('/');
  if (locale in translations) return locale as Locale;
  return defaultLocale;
}

export function getLocalizedPath(path: string, locale: Locale): string {
  // Remove existing locale prefix if present
  const cleanPath = path.replace(/^\/(en|zh)/, '');
  return `/${locale}${cleanPath || '/'}`;
}
