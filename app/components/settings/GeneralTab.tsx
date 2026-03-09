'use client';

import React from 'react';
import { GeneralSettings } from '@/lib/settings/settings-types';

// ─── Small helper ─────────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

interface Props {
  settings: GeneralSettings;
  onChange: (changes: Partial<GeneralSettings>) => void;
}

export default function GeneralTab({ settings, onChange }: Props) {
  const update = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) =>
    onChange({ [key]: value } as Partial<GeneralSettings>);

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';
  const selectCls = inputCls;

  return (
    <div className="space-y-8">
      {/* Identity */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Identité de la plateforme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nom de la plateforme">
            <input type="text" className={inputCls} value={settings.platformName}
              onChange={(e) => update('platformName', e.target.value)} />
          </Field>
          <Field label="Slogan">
            <input type="text" className={inputCls} value={settings.slogan}
              onChange={(e) => update('slogan', e.target.value)} />
          </Field>
          <Field label="Numéro de licence ACAPS" hint="Ex: LC-2024-001">
            <input type="text" className={inputCls} value={settings.acapsLicense}
              onChange={(e) => update('acapsLicense', e.target.value)} />
          </Field>
          <Field label="Site web">
            <input type="url" className={inputCls} value={settings.website}
              onChange={(e) => update('website', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Coordonnées</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Email de contact">
            <input type="email" className={inputCls} value={settings.email}
              onChange={(e) => update('email', e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <input type="tel" className={inputCls} value={settings.phone}
              onChange={(e) => update('phone', e.target.value)} />
          </Field>
          <Field label="Adresse" >
            <input type="text" className={inputCls} value={settings.address}
              onChange={(e) => update('address', e.target.value)} />
          </Field>
        </div>
      </section>

      {/* Regional */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Paramètres régionaux</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Langue">
            <select className={selectCls} value={settings.language}
              onChange={(e) => update('language', e.target.value as GeneralSettings['language'])}>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Fuseau horaire">
            <select className={selectCls} value={settings.timezone}
              onChange={(e) => update('timezone', e.target.value)}>
              <option value="Africa/Casablanca">Africa/Casablanca (UTC+1)</option>
              <option value="Europe/Paris">Europe/Paris (UTC+1/2)</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field label="Devise">
            <select className={selectCls} value={settings.currency}
              onChange={(e) => update('currency', e.target.value as GeneralSettings['currency'])}>
              <option value="MAD">MAD — Dirham</option>
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dollar</option>
            </select>
          </Field>
          <Field label="Format de date">
            <select className={selectCls} value={settings.dateFormat}
              onChange={(e) => update('dateFormat', e.target.value as GeneralSettings['dateFormat'])}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </Field>
        </div>
      </section>
    </div>
  );
}
