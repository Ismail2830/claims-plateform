'use client';

import React from 'react';
import { NotificationsSettings } from '@/lib/settings/settings-types';

interface Props {
  settings: NotificationsSettings;
  onChange: (changes: Partial<NotificationsSettings>) => void;
}

const TRIGGER_LABELS: Record<keyof NotificationsSettings['triggers'], string> = {
  newClaimAssigned:  'Nouveau sinistre assigné',
  documentUploaded:  'Document téléversé',
  aiScoreCalculated: 'Score IA calculé',
  claimEscalated:    'Sinistre escaladé',
  approvalRequired:  'Approbation requise',
  slaBreached:       'SLA dépassé',
  newMessage:        'Nouveau message',
  reportGenerated:   'Rapport généré',
};

export default function NotificationsTab({ settings, onChange }: Props) {
  const updateTrigger = (key: keyof NotificationsSettings['triggers'], val: boolean) =>
    onChange({ triggers: { ...settings.triggers, [key]: val } });

  return (
    <div className="space-y-8">
      {/* General */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Comportement</h3>
        <div className="space-y-3">
          {[
            { key: 'sound',        label: 'Son de notification' },
            { key: 'badgeCount',   label: 'Compteur de badge' },
            { key: 'groupSimilar', label: 'Grouper les notifications similaires' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input type="checkbox" className="w-4 h-4 accent-blue-600"
                checked={settings[key as 'sound' | 'badgeCount' | 'groupSimilar']}
                onChange={(e) => onChange({ [key]: e.target.checked } as Partial<NotificationsSettings>)} />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}

          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700 mr-auto">Marquer comme lu après (sec)</span>
            <input type="number" min={0} placeholder="Désactivé"
              className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.autoMarkReadDelay ?? ''}
              onChange={(e) => onChange({ autoMarkReadDelay: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
      </section>

      {/* Triggers */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Déclencheurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(TRIGGER_LABELS) as (keyof NotificationsSettings['triggers'])[]).map((key) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input type="checkbox" className="w-4 h-4 accent-blue-600"
                checked={settings.triggers[key]}
                onChange={(e) => updateTrigger(key, e.target.checked)} />
              <span className="text-sm text-gray-700">{TRIGGER_LABELS[key]}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
