import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from '@/i18n.config';

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get('NEXT_LOCALE')?.value ?? defaultLocale;
    locale = (locales as readonly string[]).includes(raw)
      ? (raw as Locale)
      : defaultLocale;
  } catch {
    // During static generation there is no request context — use default locale
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
