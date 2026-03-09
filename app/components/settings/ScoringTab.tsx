'use client';

import React from 'react';
import { ScoringSettings } from '@/lib/settings/settings-types';

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
  settings: ScoringSettings;
  onChange: (changes: Partial<ScoringSettings>) => void;
}

type WeightKey = keyof ScoringSettings['weights'];

const WEIGHT_LABELS: Record<WeightKey, string> = {
  claimsHistory:      'Historique sinistres',
  amountVsAverage:    'Montant vs moyenne',
  declarationDelay:   'Délai de déclaration',
  documentCoherence:  'Cohérence docs',
  clientProfile:      'Profil client',
  geolocationPattern: 'Géolocalisation',
  behavioralFactors:  'Facteurs comportementaux',
};

export default function ScoringTab({ settings, onChange }: Props) {
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';

  const totalWeight = Object.values(settings.weights).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      {/* Thresholds */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Seuils de risque (0–100)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['low', 'medium', 'high', 'suspicious'] as const).map((level) => {
            const colors: Record<string, string> = {
              low: 'text-green-700 bg-green-50', medium: 'text-yellow-700 bg-yellow-50',
              high: 'text-orange-700 bg-orange-50', suspicious: 'text-red-700 bg-red-50'
            };
            const labels: Record<string, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé', suspicious: 'Suspect' };
            return (
              <div key={level} className={`p-4 rounded-xl border ${colors[level].replace('text-', 'border-').replace('-700', '-200')}`}>
                <p className={`text-xs font-semibold uppercase mb-3 ${colors[level]}`}>{labels[level]}</p>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Min</span>
                    <input type="number" min={0} max={100} className={inputCls}
                      value={settings.thresholds[level].min}
                      onChange={(e) => onChange({ thresholds: { ...settings.thresholds, [level]: { ...settings.thresholds[level], min: Number(e.target.value) } } })} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Max</span>
                    <input type="number" min={0} max={100} className={inputCls}
                      value={settings.thresholds[level].max}
                      onChange={(e) => onChange({ thresholds: { ...settings.thresholds, [level]: { ...settings.thresholds[level], max: Number(e.target.value) } } })} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto actions */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Actions automatiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Escalader si score ≥">
            <input type="number" min={0} max={100} className={inputCls} value={settings.autoActions.escalateAbove}
              onChange={(e) => onChange({ autoActions: { ...settings.autoActions, escalateAbove: Number(e.target.value) } })} />
          </Field>
          <Field label="Bloquer approbation si score ≥">
            <input type="number" min={0} max={100} className={inputCls} value={settings.autoActions.blockApprovalAbove}
              onChange={(e) => onChange({ autoActions: { ...settings.autoActions, blockApprovalAbove: Number(e.target.value) } })} />
          </Field>
          <Field label="Notifier admin si score ≥">
            <input type="number" min={0} max={100} className={inputCls} value={settings.autoActions.notifyAdminAbove}
              onChange={(e) => onChange({ autoActions: { ...settings.autoActions, notifyAdminAbove: Number(e.target.value) } })} />
          </Field>
        </div>
      </section>

      {/* Weights */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">Pondération des facteurs</h3>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Total: {totalWeight}%
          </span>
        </div>
        {totalWeight !== 100 && (
          <p className="mb-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            La somme des poids doit être égale à 100%.
          </p>
        )}
        <div className="space-y-3">
          {(Object.keys(settings.weights) as WeightKey[]).map((key) => (
            <div key={key} className="flex items-center gap-4">
              <span className="text-sm text-gray-700 w-56">{WEIGHT_LABELS[key]}</span>
              <input type="range" min={0} max={100} className="flex-1 accent-blue-600"
                value={settings.weights[key]}
                onChange={(e) => onChange({ weights: { ...settings.weights, [key]: Number(e.target.value) } })} />
              <span className="text-sm font-medium text-gray-700 w-12 text-right">{settings.weights[key]}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Toggles */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Déclencheurs</h3>
        <div className="space-y-3">
          {[
            { key: 'autoScoring',                  label: 'Scoring automatique à la création' },
            { key: 'recalculateOnDocUpload',        label: 'Recalculer à l\'upload de document' },
            { key: 'recalculateOnStatusChange',     label: 'Recalculer au changement de statut' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-blue-600"
                checked={settings[key as 'autoScoring' | 'recalculateOnDocUpload' | 'recalculateOnStatusChange']}
                onChange={(e) => onChange({ [key]: e.target.checked } as Partial<ScoringSettings>)} />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
