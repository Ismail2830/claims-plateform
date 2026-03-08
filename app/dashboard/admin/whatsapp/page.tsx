'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function AdminWhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">WhatsApp Bot</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configuration du bot WhatsApp</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
        <MessageCircle className="h-12 w-12 text-green-400 mb-3" />
        <p className="font-semibold text-gray-700">Module WhatsApp</p>
        <p className="text-sm text-gray-400 mt-1">Configurez les flux de conversation automatisés depuis ce panneau.</p>
      </div>
    </div>
  );
}
