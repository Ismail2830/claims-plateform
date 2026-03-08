'use client';

import { formatConversationDate, getUrgencyConfig, getVisibilityConfig } from '@/app/lib/messages-utils';
import type { Conversation } from '@/app/hooks/useConversations';

interface Props {
  conversation:    Conversation;
  isActive:        boolean;
  currentUserId:   string;
  onClick:         () => void;
}

const CONV_TYPE_LABELS: Record<string, string> = {
  CLIENT:       'Client',
  INTERNAL:     'Interne',
  CLAIM_LINKED: 'Sinistre',
  ESCALATION:   'Escalade',
};

export default function ConversationItem({ conversation: c, isActive, currentUserId, onClick }: Props) {
  const urgencyConfig = getUrgencyConfig(c.urgencyLevel as Parameters<typeof getUrgencyConfig>[0]);
  const otherParticipants = c.participants.filter(p => p.userId !== currentUserId);
  const displayName = c.subject
    ?? (otherParticipants.length > 0
      ? `${otherParticipants[0].firstName} ${otherParticipants[0].lastName}`
      : 'Conversation');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              c.type === 'ESCALATION' ? 'bg-red-100 text-red-700' :
              c.type === 'CLIENT'     ? 'bg-green-100 text-green-700' :
              c.type === 'CLAIM_LINKED' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {CONV_TYPE_LABELS[c.type] ?? c.type}
            </span>
            {urgencyConfig.level !== 'NORMAL' && (
              <span className={`text-xs font-bold ${urgencyConfig.textColor}`}>
                {urgencyConfig.icon} {urgencyConfig.label}
              </span>
            )}
          </div>
          <p className={`text-sm truncate ${c.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {displayName}
          </p>
          {c.claim && (
            <p className="text-xs text-purple-600 truncate">
              {c.claim.claimNumber} — {c.claim.claimType}
            </p>
          )}
          <p className="text-xs text-gray-500 truncate mt-0.5">{c.lastMessage ?? '—'}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-gray-400">{formatConversationDate(c.lastMessageAt)}</span>
          {c.unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center font-bold">
              {c.unreadCount > 99 ? '99+' : c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
