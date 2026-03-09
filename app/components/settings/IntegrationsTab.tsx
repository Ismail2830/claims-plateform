'use client';

import React, { useState } from 'react';
import { IntegrationsSettings } from '@/lib/settings/settings-types';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  settings: IntegrationsSettings;
  onChange: (changes: Partial<IntegrationsSettings>) => void;
}

type TestResult = { ok: boolean; msg: string } | null;

export default function IntegrationsTab({ settings, onChange }: Props) {
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition';

  const test = async (type: 'whatsapp' | 'pusher' | 'storage', body: object) => {
    setTesting(type);
    try {
      const res  = await fetch('/api/settings/test-integration', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, ...body }),
      });
      const json = await res.json();
      setResults((r) => ({ ...r, [type]: { ok: json.success, msg: json.message ?? json.error } }));
    } catch {
      setResults((r) => ({ ...r, [type]: { ok: false, msg: 'Erreur réseau' } }));
    } finally {
      setTesting(null);
    }
  };

  const TestStatus = ({ type }: { type: string }) => {
    const r = results[type];
    if (!r) return null;
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${r.ok ? 'text-green-600' : 'text-red-600'}`}>
        {r.ok ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
        {r.msg}
      </span>
    );
  };

  const TestBtn = ({ type, onClick }: { type: string; onClick: () => void }) => (
    <button onClick={onClick} disabled={testing !== null}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
      {testing === type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
      Tester
    </button>
  );

  return (
    <div className="space-y-8">
      {/* WhatsApp */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">WhatsApp Business</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <Field label="Token d&apos;accès">
            <input type="password" className={inputCls} autoComplete="off"
              value={settings.whatsapp.token}
              onChange={(e) => onChange({ whatsapp: { ...settings.whatsapp, token: e.target.value } })} />
          </Field>
          <Field label="Numéro de téléphone">
            <input type="text" className={inputCls} placeholder="+212600000000"
              value={settings.whatsapp.phoneNumber}
              onChange={(e) => onChange({ whatsapp: { ...settings.whatsapp, phoneNumber: e.target.value } })} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <TestBtn type="whatsapp" onClick={() => test('whatsapp', settings.whatsapp)} />
          <TestStatus type="whatsapp" />
        </div>
      </section>

      {/* Pusher */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Pusher (temps réel)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <Field label="App ID">
            <input type="text" className={inputCls} value={settings.pusher.appId}
              onChange={(e) => onChange({ pusher: { ...settings.pusher, appId: e.target.value } })} />
          </Field>
          <Field label="Key">
            <input type="text" className={inputCls} value={settings.pusher.key}
              onChange={(e) => onChange({ pusher: { ...settings.pusher, key: e.target.value } })} />
          </Field>
          <Field label="Secret">
            <input type="password" className={inputCls} autoComplete="off"
              value={settings.pusher.secret}
              onChange={(e) => onChange({ pusher: { ...settings.pusher, secret: e.target.value } })} />
          </Field>
          <Field label="Cluster">
            <input type="text" className={inputCls} placeholder="eu"
              value={settings.pusher.cluster}
              onChange={(e) => onChange({ pusher: { ...settings.pusher, cluster: e.target.value } })} />
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <TestBtn type="pusher" onClick={() => test('pusher', settings.pusher)} />
          <TestStatus type="pusher" />
        </div>
      </section>

      {/* Storage */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Stockage de fichiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Fournisseur">
            <select className={inputCls} value={settings.storage.provider}
              onChange={(e) => onChange({ storage: { ...settings.storage, provider: e.target.value as IntegrationsSettings['storage']['provider'] } })}>
              <option value="local">Local</option>
              <option value="cloudinary">Cloudinary</option>
              <option value="s3">Amazon S3</option>
            </select>
          </Field>
          <Field label="Taille maximale (MB)">
            <input type="number" min={1} className={inputCls}
              value={settings.storage.maxSizeMB}
              onChange={(e) => onChange({ storage: { ...settings.storage, maxSizeMB: Number(e.target.value) } })} />
          </Field>
        </div>
      </section>
    </div>
  );
}
