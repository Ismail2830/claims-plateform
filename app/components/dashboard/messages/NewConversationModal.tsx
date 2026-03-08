'use client';

import { useState, useEffect, useRef } from 'react';

interface Participant {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
  role:      string;
  kind:      'staff' | 'client';
}

interface Props {
  currentUserId: string;
  onClose:       () => void;
  onCreated:     (id: string) => void;
}

const TYPE_OPTIONS = [
  { value: 'CLIENT',       label: 'Client',         icon: '👤' },
  { value: 'INTERNAL',     label: 'Interne',        icon: '👥' },
  { value: 'CLAIM_LINKED', label: 'Lié à sinistre', icon: '📋' },
  { value: 'ESCALATION',   label: 'Escalade',       icon: '🚨' },
];

export default function NewConversationModal({ currentUserId, onClose, onCreated }: Props) {
  const [type, setType]               = useState('INTERNAL');
  const [subject, setSubject]         = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [visibility, setVisibility]   = useState('ALL');
  const [urgencyLevel, setUrgencyLevel] = useState('NORMAL');
  const [claimId, setClaimId]         = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [searchResults, setSearchResults]         = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [searching, setSearching]     = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const debounceRef                   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (participantSearch.trim().length < 1) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(
          `/api/messages/participants?search=${encodeURIComponent(participantSearch)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const data = await res.json() as { data?: Participant[] };
        const filtered = (data.data ?? []).filter(
          p => p.id !== currentUserId && !selectedParticipants.find(s => s.id === p.id)
        );
        setSearchResults(filtered);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [participantSearch, currentUserId, selectedParticipants]);

  const addParticipant = (p: Participant) => {
    setSelectedParticipants(s => [...s, p]);
    setParticipantSearch('');
    setSearchResults([]);
  };

  const removeParticipant = (id: string) => {
    setSelectedParticipants(s => s.filter(p => p.id !== id));
  };

  const handleSubmit = async () => {
    if (!firstMessage.trim()) { setError('Le message initial est requis'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/messages/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body:    JSON.stringify({
          type,
          participantIds: selectedParticipants.map(p => p.id),
          claimId:        claimId || undefined,
          subject:        subject || undefined,
          firstMessage:   firstMessage.trim(),
          visibility,
          urgencyLevel,
        }),
      });
      let data: { success?: boolean; data?: { id: string }; error?: unknown };
      try { data = await res.json(); } catch {
        throw new Error('Le serveur a retourné une réponse invalide');
      }
      if (!res.ok || !data.success) {
        const msg = typeof data?.error === 'string'
          ? data.error
          : Array.isArray(data?.error)
            ? (data.error as Array<{ message: string }>).map(e => e.message).join(', ')
            : 'Erreur lors de la création';
        throw new Error(msg);
      }
      onCreated(data.data!.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">Nouvelle conversation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Type */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${type === t.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Participants</label>
            {selectedParticipants.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-2">
                {selectedParticipants.map(p => (
                  <span key={p.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${p.kind === 'client' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {p.kind === 'client' ? '👤' : '👥'} {p.firstName} {p.lastName}
                    <button onClick={() => removeParticipant(p.id)} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                value={participantSearch}
                onChange={e => setParticipantSearch(e.target.value)}
                placeholder="Rechercher un client ou un membre du staff..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoComplete="off"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</span>
              )}
            </div>
            {participantSearch.trim().length > 0 && (
              <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto">
                {searchResults.length === 0 && !searching && (
                  <p className="px-3 py-2 text-sm text-gray-400">Aucun résultat</p>
                )}
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addParticipant(p)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-2"
                  >
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.kind === 'client' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.kind === 'client' ? 'Client' : p.role.replace(/_/g, ' ')}
                    </span>
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-gray-400 text-xs truncate">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Sujet (optionnel)</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Sujet de la conversation"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Claim ID */}
          {type === 'CLAIM_LINKED' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">ID Sinistre</label>
              <input
                value={claimId}
                onChange={e => setClaimId(e.target.value)}
                placeholder="UUID du sinistre"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Urgency */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Niveau d'urgence</label>
            <select
              value={urgencyLevel}
              onChange={e => setUrgencyLevel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Élevé</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* First message */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Premier message *</label>
            <textarea
              value={firstMessage}
              onChange={e => setFirstMessage(e.target.value)}
              placeholder="Écrivez votre premier message..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || !firstMessage.trim()}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Création...' : 'Créer la conversation'}
          </button>
        </div>
      </div>
    </div>
  );
}

