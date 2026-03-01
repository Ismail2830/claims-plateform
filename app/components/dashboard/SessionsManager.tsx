'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Shield,
  ShieldOff,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  rememberMe: boolean;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
}

function DeviceIcon({ deviceName }: { deviceName: string | null }) {
  const name = deviceName?.toLowerCase() ?? '';
  if (name.includes('iphone') || name.includes('android phone')) {
    return <Smartphone className="w-5 h-5 text-blue-500" />;
  }
  if (name.includes('ipad') || name.includes('tablet')) {
    return <Tablet className="w-5 h-5 text-purple-500" />;
  }
  return <Monitor className="w-5 h-5 text-gray-500" />;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionsManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sessions', {
        headers: { Authorization: `Bearer ${localStorage.getItem('clientToken') ?? ''}` },
      });
      const data = await res.json();
      if (data.success) {
        setSessions(data.data);
      } else {
        setError(data.message || 'Failed to load sessions');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    setError('');
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('clientToken') ?? ''}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setSuccess('Session revoked successfully.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to revoke session');
      }
    } catch {
      setError('Network error');
    } finally {
      setRevoking(null);
    }
  };

  const revokeOthers = async () => {
    setRevokingAll(true);
    setError('');
    try {
      const res = await fetch('/api/auth/sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('clientToken') ?? ''}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('All other sessions revoked.');
        setTimeout(() => setSuccess(''), 3000);
        fetchSessions();
      } else {
        setError(data.message || 'Failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Active Sessions</h2>
          <p className="text-sm text-gray-500 mt-1">
            Devices and browsers currently signed in to your account.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {sessions.length > 1 && (
            <button
              onClick={revokeOthers}
              disabled={revokingAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              {revokingAll ? 'Revoking…' : 'Revoke all others'}
            </button>
          )}
        </div>
      </div>

      {/* Feedback banners */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700"
          >
            <Shield className="w-4 h-4 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No active sessions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors bg-white"
              >
                {/* Left: icon + info */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <DeviceIcon deviceName={session.deviceName} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">
                        {session.deviceName ?? 'Unknown device'}
                      </span>
                      {session.rememberMe && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Shield className="w-2.5 h-2.5" />
                          Remembered
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {session.ipAddress ?? '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Active {timeAgo(session.lastActivity)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Expires {formatDate(session.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* Right: revoke button */}
                <button
                  onClick={() => revokeSession(session.id)}
                  disabled={revoking === session.id}
                  title="Revoke this session"
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors shrink-0 ml-4"
                >
                  {revoking === session.id ? (
                    <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Revoke
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Revoking a session will sign out that device immediately. Your current session will remain active.
      </p>
    </div>
  );
}
