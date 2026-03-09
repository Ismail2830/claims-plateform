'use client';

import React from 'react';
import { ClaimsSettings } from '@/lib/settings/settings-types';

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
  settings: ClaimsSettings;
  onChange: (changes: Partial<ClaimsSettings>) => void;
}

const CLAIM_TYPES = ['AUTO', 'HABITATION', 'SANTE', 'VIE'];

export default function ClaimsTab({ settings, onChange }: Props) {
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition';

  const updateApprovalLimit = (role: 'MANAGER_JUNIOR' | 'MANAGER_SENIOR', value: number) =>
    onChange({ approvalLimits: { ...settings.approvalLimits, [role]: value } });

  const updateSla = (type: string, field: 'warningDays' | 'criticalDays', value: number) =>
    onChange({
      slaByType: {
        ...settings.slaByType,
        [type]: { ...settings.slaByType[type as keyof typeof settings.slaByType], [field]: value },
      },
    });

  const toggleType = (type: string) => {
    const current = settings.activeTypes;
    const updated  = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ activeTypes: updated });
  };

  return (
    <div className="space-y-8">
      {/* Approval limits */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Limites d&apos;approbation (MAD)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Manager Junior">
            <input type="number" min={0} className={inputCls} value={settings.approvalLimits.MANAGER_JUNIOR}
              onChange={(e) => updateApprovalLimit('MANAGER_JUNIOR', Number(e.target.value))} />
          </Field>
          <Field label="Manager Senior">
            <input type="number" min={0} className={inputCls} value={settings.approvalLimits.MANAGER_SENIOR}
              onChange={(e) => updateApprovalLimit('MANAGER_SENIOR', Number(e.target.value))} />
          </Field>
        </div>
      </section>

      {/* SLA by type */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">SLA par type de sinistre (jours)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Avertissement</th>
                <th className="pb-2">Critique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {CLAIM_TYPES.map((type) => {
                const sla = settings.slaByType[type as keyof typeof settings.slaByType];
                if (!sla) return null;
                return (
                  <tr key={type}>
                    <td className="py-2 pr-4 font-medium text-gray-700">{type}</td>
                    <td className="py-2 pr-4">
                      <input type="number" min={1} className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                        value={sla.warningDays}
                        onChange={(e) => updateSla(type, 'warningDays', Number(e.target.value))} />
                    </td>
                    <td className="py-2">
                      <input type="number" min={1} className="w-24 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                        value={sla.criticalDays}
                        onChange={(e) => updateSla(type, 'criticalDays', Number(e.target.value))} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Workload */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Charge de travail</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Max sinistres / manager">
            <input type="number" min={1} className={inputCls} value={settings.workload.maxPerManager}
              onChange={(e) => onChange({ workload: { ...settings.workload, maxPerManager: Number(e.target.value) } })} />
          </Field>
          <Field label="Seuil avertissement (%)">
            <input type="number" min={1} max={100} className={inputCls} value={settings.workload.warningPercent}
              onChange={(e) => onChange({ workload: { ...settings.workload, warningPercent: Number(e.target.value) } })} />
          </Field>
          <Field label="Seuil critique (%)">
            <input type="number" min={1} max={100} className={inputCls} value={settings.workload.criticalPercent}
              onChange={(e) => onChange({ workload: { ...settings.workload, criticalPercent: Number(e.target.value) } })} />
          </Field>
        </div>
      </section>

      {/* Active types */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Types de sinistres actifs</h3>
        <div className="flex flex-wrap gap-3">
          {CLAIM_TYPES.map((type) => {
            const active = settings.activeTypes.includes(type);
            return (
              <button key={type} type="button" onClick={() => toggleType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {type}
              </button>
            );
          })}
        </div>
      </section>

      {/* Auto-reassign */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Réaffectation automatique</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={settings.autoReassign.enabled}
              onChange={(e) => onChange({ autoReassign: { ...settings.autoReassign, enabled: e.target.checked } })} />
            <span className="text-sm text-gray-700">Activer la réaffectation automatique</span>
          </label>
          {settings.autoReassign.enabled && (
            <Field label="">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">Après</span>
                <input type="number" min={1} className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm"
                  value={settings.autoReassign.afterDays}
                  onChange={(e) => onChange({ autoReassign: { ...settings.autoReassign, afterDays: Number(e.target.value) } })} />
                <span className="text-sm text-gray-500">jours d&apos;inactivité</span>
              </div>
            </Field>
          )}
        </div>
      </section>
    </div>
  );
}
