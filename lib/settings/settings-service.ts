import { prisma } from '@/app/lib/prisma';
import { DEFAULT_SETTINGS, PlatformSettings } from './settings-types';
import { logPlatformAction } from '@/lib/audit/audit-logger';

// ─── In-memory cache ──────────────────────────────────────────────────────────
let cache: PlatformSettings | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export function invalidateSettingsCache(): void {
  cache = null;
  cacheExpiry = 0;
}

// ─── Deep merge helper ────────────────────────────────────────────────────────
function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override as object)) {
    const v = (override as Record<string, unknown>)[key];
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        v as Record<string, unknown>
      );
    } else {
      result[key] = v;
    }
  }
  return result as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getSettings(): Promise<PlatformSettings> {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;

  let record = await prisma.platformSettings.findUnique({
    where: { id: 'singleton' },
  });

  if (!record) {
    record = await prisma.platformSettings.create({
      data: {
        id: 'singleton',
        data: DEFAULT_SETTINGS as object,
      },
    });
  }

  cache = deepMerge(DEFAULT_SETTINGS, record.data as Partial<PlatformSettings>);
  cacheExpiry = now + CACHE_TTL_MS;
  return cache;
}

export type SettingsSection = keyof PlatformSettings;

export async function updateSettings(
  section: SettingsSection,
  data: Partial<PlatformSettings[SettingsSection]>,
  updatedBy?: string,
): Promise<PlatformSettings> {
  const current = await getSettings();
  const updated: PlatformSettings = {
    ...current,
    [section]: deepMerge(current[section] as object, data as object),
  };

  await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    update: { data: updated as object, updatedBy: updatedBy ?? null },
    create: { id: 'singleton', data: updated as object, updatedBy: updatedBy ?? null },
  });

  // Mask SMTP password before logging
  if (section === 'email' && (data as { smtp?: { password?: string } }).smtp?.password) {
    (data as { smtp?: { password?: string } }).smtp!.password = '***';
  }

  await logPlatformAction({
    action: 'SETTINGS_UPDATED',
    resourceType: 'PlatformSettings',
    resourceId: section,
    metadata: { section, changes: data },
  }).catch(() => {/* non-blocking */});

  invalidateSettingsCache();
  return getSettings();
}

/**
 * Reads a nested value from settings using dot-notation path.
 * e.g. getSettingValue<number>('scoring.thresholds.high.max')
 */
export async function getSettingValue<T>(path: string): Promise<T> {
  const settings = await getSettings();
  const parts = path.split('.');
  let current: unknown = settings;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      throw new Error(`Settings path "${path}" not found at "${part}"`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current as T;
}

/** Returns settings with SMTP password masked for safe frontend delivery. */
export async function getSafeSettings(): Promise<PlatformSettings> {
  const settings = await getSettings();
  return {
    ...settings,
    email: {
      ...settings.email,
      smtp: {
        ...settings.email.smtp,
        password: settings.email.smtp.password ? '••••••••' : '',
      },
    },
  };
}
