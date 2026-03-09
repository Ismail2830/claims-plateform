'use client';

import React, { useState } from 'react';
import { EmailSettings } from '@/lib/settings/settings-types';
import { Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

interface Props {
  settings: EmailSettings;
  onChange: (changes: Partial<EmailSettings>) => void;
}

export default function EmailTab({ settings, onChange }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition';
  const updateSmtp = (patch: Partial<EmailSettings['smtp']>) =>
    onChange({ smtp: { ...settings.smtp, ...patch } });
  const updateTriggers = (patch: Partial<EmailSettings['triggers']>) =>
    onChange({ triggers: { ...settings.triggers, ...patch } });

  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res  = await fetch('/api/settings/test-email', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({}),
      });
      const json = await res.json();
      setTestResult({ ok: json.success, msg: json.message ?? json.error });
    } catch {
      setTestResult({ ok: false, msg: 'Erreur réseau' });
    } finally {
      setTesting(false);
    }
  };

  const TRIGGER_LABELS: Record<keyof EmailSettings['triggers'], string> = {
    newClaim:         'Nouveau sinistre',
    statusChanged:    'Changement de statut',
    documentRejected: 'Document rejeté',
    claimResolved:    'Sinistre résolu',
    slaBreached:      'SLA dépassé',
    highRiskScore:    'Score de risque élevé',
    reportGenerated:  'Rapport généré',
  };

  return (
    <div className="space-y-8">
      {/* SMTP */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Configuration SMTP</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Serveur SMTP">
            <input type="text" className={inputCls} placeholder="smtp.example.com"
              value={settings.smtp.host}
              onChange={(e) => updateSmtp({ host: e.target.value })} />
          </Field>
          <Field label="Port">
            <input type="number" className={inputCls} value={settings.smtp.port}
              onChange={(e) => updateSmtp({ port: Number(e.target.value) })} />
          </Field>
          <Field label="Sécurité">
            <select className={inputCls} value={settings.smtp.security}
              onChange={(e) => updateSmtp({ security: e.target.value as EmailSettings['smtp']['security'] })}>
              <option value="TLS">TLS (587)</option>
              <option value="SSL">SSL (465)</option>
              <option value="NONE">Aucune (25)</option>
            </select>
          </Field>
          <Field label="Utilisateur">
            <input type="text" className={inputCls} autoComplete="off"
              value={settings.smtp.user}
              onChange={(e) => updateSmtp({ user: e.target.value })} />
          </Field>
          <Field label="Mot de passe">
            <input type="password" className={inputCls} autoComplete="new-password"
              value={settings.smtp.password}
              onChange={(e) => updateSmtp({ password: e.target.value })} />
          </Field>
          <Field label="Nom expéditeur">
            <input type="text" className={inputCls}
              value={settings.smtp.fromName}
              onChange={(e) => updateSmtp({ fromName: e.target.value })} />
          </Field>
          <Field label="Email expéditeur">
            <input type="email" className={inputCls}
              value={settings.smtp.fromEmail}
              onChange={(e) => updateSmtp({ fromEmail: e.target.value })} />
          </Field>
        </div>

        {/* Test button */}
        <div className="mt-5 flex items-center gap-4">
          <button onClick={handleTestEmail} disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {testing ? 'Envoi…' : 'Envoyer un email de test'}
          </button>
          {testResult && (
            <span className={`flex items-center gap-1.5 text-sm font-medium ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {testResult.msg}
            </span>
          )}
        </div>
      </section>

      {/* Signature */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Signature email</h3>
        <textarea rows={3} className={`${inputCls} resize-none`}
          value={settings.signature}
          onChange={(e) => onChange({ signature: e.target.value })} />
      </section>

      {/* Triggers */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Déclencheurs d&apos;envoi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(TRIGGER_LABELS) as (keyof EmailSettings['triggers'])[]).map((key) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input type="checkbox" className="w-4 h-4 accent-blue-600"
                checked={settings.triggers[key]}
                onChange={(e) => updateTriggers({ [key]: e.target.checked })} />
              <span className="text-sm text-gray-700">{TRIGGER_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
