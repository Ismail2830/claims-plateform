'use client';

import { useState } from 'react';
import { useConversations, type ConversationFilters, type Conversation } from '@/app/hooks/useConversations';
import ConversationItem from './ConversationItem';

interface Props {
  currentUserId:       string;
  activeConversationId: string | null;
  onSelect:            (id: string) => void;
  onNewConversation:   () => void;
}

const TABS = [
  { key: '',            label: 'Tous' },
  { key: 'CLIENT',      label: 'Clients' },
  { key: 'INTERNAL',    label: 'Internes' },
  { key: 'CLAIM_LINKED',label: 'Sinistres' },
  { key: 'ESCALATION',  label: 'Escalades' },
];

export default function ConversationList({ currentUserId, activeConversationId, onSelect, onNewConversation }: Props) {
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [search, setSearch]   = useState('');
  const { conversations, isLoading, error } = useConversations({ ...filters, search: search || undefined });

  const handleTab = (key: string) => {
    setFilters(f => ({ ...f, type: key || undefined }));
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Messagerie</h2>
          <button
            onClick={onNewConversation}
            className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nouveau
          </button>
        </div>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {/* Filters row */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setFilters(f => ({ ...f, urgentOnly: !f.urgentOnly }))}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${filters.urgentOnly ? 'bg-red-100 border-red-300 text-red-700 font-semibold' : 'border-gray-200 text-gray-500'}`}
          >
            🔥 Urgent
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, unreadOnly: !f.unreadOnly }))}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${filters.unreadOnly ? 'bg-blue-100 border-blue-300 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500'}`}
          >
            Non lus
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, archived: !f.archived }))}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${filters.archived ? 'bg-gray-200 border-gray-400 text-gray-700 font-semibold' : 'border-gray-200 text-gray-500'}`}
          >
            Archivés
          </button>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 px-2 pt-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            className={`shrink-0 text-xs px-3 py-2 border-b-2 transition-colors ${
              (filters.type ?? '') === t.key
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-gray-400 text-sm">Chargement...</div>
        )}
        {error && (
          <div className="p-4 text-center text-red-500 text-sm">Erreur de chargement</div>
        )}
        {!isLoading && !error && conversations.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">Aucune conversation</div>
        )}
        {conversations.map(c => (
          <ConversationItem
            key={c.id}
            conversation={c}
            isActive={c.id === activeConversationId}
            currentUserId={currentUserId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    </div>
  );
}
