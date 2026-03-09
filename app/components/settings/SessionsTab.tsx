'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Trash2, Shield } from 'lucide-react';

interface ActiveSession {
  id: string;
  userId: string | null;
  ipAddress: string | null;
  browser: string | null;
  userAgent: string | null;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
}

export default function SessionsTab() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/sessions');
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const revoke = async (id: string) => {
    setRevoking(id);
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
    setSessions((s) => s.filter((x) => x.id !== id));
    setRevoking(null);
  };

  const revokeAll = async () => {
    if (!confirm('Révoquer toutes les autres sessions ?')) return;
    setLoading(true);
    await fetch('/api/sessions/all', { method: 'DELETE' });
    await refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">{sessions.length}</span> session(s) active(s)
        </p>
        <div className="flex items-center gap-3">
          <button onClick={refetch} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
          {sessions.length > 1 && (
            <button onClick={revokeAll}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
              <Shield className="w-4 h-4" />
              Révoquer toutes
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Aucune session active</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Navigateur</th>
                <th className="px-4 py-3 text-left">IP</th>
                <th className="px-4 py-3 text-left">Dernière activité</th>
                <th className="px-4 py-3 text-left">Expire</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.userId?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{s.browser ?? s.userAgent?.slice(0, 40) ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.ipAddress ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.lastActivity).toLocaleString('fr-MA')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.expiresAt).toLocaleString('fr-MA')}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => revoke(s.id)} disabled={revoking === s.id}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                      {revoking === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
