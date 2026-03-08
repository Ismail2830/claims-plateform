'use client';

import React from 'react';
import { Mail } from 'lucide-react';

export default function AdminEmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Modèles emails</h2>
        <p className="text-sm text-gray-500 mt-0.5">Personnalisez les emails automatiques envoyés aux clients</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
        <Mail className="h-12 w-12 text-blue-300 mb-3" />
        <p className="font-semibold text-gray-700">Éditeur de modèles emails</p>
        <p className="text-sm text-gray-400 mt-1">Les modèles d&apos;emails personnalisables seront disponibles prochainement.</p>
      </div>
    </div>
  );
}
