export const locales = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const localeCookieName = 'NEXT_LOCALE';
