'use client';

import { useState, useEffect } from 'react';
import { defaultLocale, locales, localeCookieName, type Locale } from '@/i18n.config';

const LOCALE_EVENT = 'app:locale-changed';

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const readLocale = () => {
      const stored = localStorage.getItem(localeCookieName) as Locale | null;
      if (stored && (locales as readonly string[]).includes(stored)) {
        setLocale(stored);
      }
    };

    readLocale(); // Read on mount

    // Listen for locale changes from any component on this page
    window.addEventListener(LOCALE_EVENT, readLocale);
    // Listen for changes made in other tabs
    window.addEventListener('storage', readLocale);

    return () => {
      window.removeEventListener(LOCALE_EVENT, readLocale);
      window.removeEventListener('storage', readLocale);
    };
  }, []);

  const changeLocale = (newLocale: Locale) => {
    localStorage.setItem(localeCookieName, newLocale);
    document.cookie = `${localeCookieName}=${newLocale}; path=/; max-age=31536000`;
    setLocale(newLocale);
    // Notify all other useLocale instances on this page
    window.dispatchEvent(new Event(LOCALE_EVENT));
  };

  return { locale, changeLocale };
}
