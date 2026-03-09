'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlatformSettings } from '@/lib/settings/settings-types';

interface UseSettingsReturn {
  settings: PlatformSettings | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSection: <K extends keyof PlatformSettings>(
    section: K,
    data: Partial<PlatformSettings[K]>
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
      } else {
        setError(json.error ?? 'Erreur de chargement');
      }
    } catch {
      setError('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const updateSection = useCallback(async <K extends keyof PlatformSettings>(
    section: K,
    data: Partial<PlatformSettings[K]>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res  = await fetch(`/api/settings/${section}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        return { success: true };
      }
      return { success: false, error: json.error };
    } catch {
      return { success: false, error: 'Erreur réseau' };
    }
  }, []);

  return { settings, loading, error, refetch, updateSection };
}
