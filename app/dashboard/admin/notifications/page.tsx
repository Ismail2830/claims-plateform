'use client';

import React from 'react';
import { Bell } from 'lucide-react';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des notifications système</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-center">
        <Bell className="h-12 w-12 text-blue-300 mb-3" />
        <p className="font-semibold text-gray-700">Centre de notifications</p>
        <p className="text-sm text-gray-400 mt-1">Aucune notification en attente.</p>
      </div>
    </div>
  );
}
