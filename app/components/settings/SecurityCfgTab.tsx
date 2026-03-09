'use client';

import React, { useState, useCallback } from 'react';
import { useSettings } from '@/app/hooks/useSettings';
import { SecuritySettings } from '@/lib/settings/settings-types';
import { Loader2, Save, CheckCircle, AlertTriangle, Plus, X } from 'lucide-react';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function SecurityCfgTab() {
  const { settings, loading, updateSection } = useSettings();
  const [local, setLocal] = useState<SecuritySettings | null>(null);
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [newIp, setNewIp]     = useState('');

  const cfg: SecuritySettings = local ?? settings?.security ?? {
    sessionDurationHours: 8,
    maxLoginAttempts:     5,
    twoFactorEnabled:     false,
    ipWhitelist:          [],
  };

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) =>
    setLocal({ ...cfg, [key]: value });

  const addIp = () => {
    const ip = newIp.trim();
    if (!ip || cfg.ipWhitelist.includes(ip)) return;
    update('ipWhitelist', [...cfg.ipWhitelist, ip]);
    setNewIp('');
  };

  const removeIp = (ip: string) =>
    update('ipWhitelist', cfg.ipWhitelist.filter((x) => x !== ip));

  const handleSave = useCallback(async () => {
    if (!local) return;
    setSaving(true);
    setResult(null);
    const res = await updateSection('security', local);
    setSaving(false);
    setResult({ ok: res.success, msg: res.success ? 'Sauvegardé' : (res.error ?? 'Erreur') });
    if (res.success) setLocal(null);
  }, [local, updateSection]);

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition';

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Session */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Gestion des sessions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Durée de session (heures)" hint="0 = pas d'expiration">
            <input type="number" min={0} max={168} className={inputCls}
              value={cfg.sessionDurationHours}
              onChange={(e) => update('sessionDurationHours', Number(e.target.value))} />
          </Field>
          <Field label="Tentatives max avant blocage">
            <input type="number" min={1} max={20} className={inputCls}
              value={cfg.maxLoginAttempts}
              onChange={(e) => update('maxLoginAttempts', Number(e.target.value))} />
          </Field>
        </div>
      </section>

      {/* 2FA */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Authentification à deux facteurs</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-blue-600"
            checked={cfg.twoFactorEnabled}
            onChange={(e) => update('twoFactorEnabled', e.target.checked)} />
          <span className="text-sm text-gray-700">Activer le 2FA pour tous les administrateurs</span>
        </label>
      </section>

      {/* IP Whitelist */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Liste blanche IP</h3>
        <p className="mb-3 text-xs text-gray-400">Laisser vide = accès depuis n&apos;importe quelle IP.</p>
        <div className="flex gap-2 mb-3">
          <input type="text" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="192.168.1.0/24"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIp(); } }} />
          <button onClick={addIp}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.ipWhitelist.map((ip) => (
            <span key={ip} className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs font-mono">
              {ip}
              <button onClick={() => removeIp(ip)} className="text-blue-400 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          {cfg.ipWhitelist.length === 0 && (
            <span className="text-sm text-gray-400">Aucune restriction IP active</span>
          )}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2">
        <button onClick={handleSave} disabled={saving || !local}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
        {result && (
          <span className={`flex items-center gap-1.5 text-sm font-medium ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
            {result.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {result.msg}
          </span>
        )}
      </div>
    </div>
  );
}
