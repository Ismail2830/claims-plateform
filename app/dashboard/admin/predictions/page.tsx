'use client';

import React from 'react';
import { Sparkles, TrendingUp, Brain } from 'lucide-react';

export default function AdminPredictionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Prédictions IA</h2>
        <p className="text-sm text-gray-500 mt-0.5">Modèles prédictifs et anticipation des sinistres</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Prédictions générées', icon: Sparkles,   color: 'bg-purple-100 text-purple-600' },
          { label: 'Précision du modèle',  icon: TrendingUp, color: 'bg-green-100 text-green-600' },
          { label: 'Anomalies détectées',  icon: Brain,      color: 'bg-orange-100 text-orange-600' },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900">—</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
        <Sparkles className="h-12 w-12 text-purple-300 mb-3" />
        <p className="font-semibold text-gray-700">Module Prédictions IA</p>
        <p className="text-sm text-gray-400 mt-1">Les capacités prédictives avancées seront disponibles prochainement.</p>
      </div>
    </div>
  );
}
