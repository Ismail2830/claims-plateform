'use client';

import React from 'react';
import { Lock, Shield, AlertTriangle } from 'lucide-react';

export default function AdminSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sécurité & Audit</h2>
        <p className="text-sm text-gray-500 mt-0.5">Journaux et paramètres de sécurité</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Tentatives échouées', value: 0, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
          { label: 'Sessions actives',    value: 0, icon: Shield,        color: 'bg-green-100 text-green-600' },
          { label: 'Audit logs',          value: 0, icon: Lock,          color: 'bg-blue-100 text-blue-600' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
        <Lock className="h-12 w-12 text-gray-300 mb-3" />
        <p className="font-semibold text-gray-700">Journal d&apos;audit</p>
        <p className="text-sm text-gray-400 mt-1">Le suivi détaillé des événements de sécurité sera disponible prochainement.</p>
      </div>
    </div>
  );
}
