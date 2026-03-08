'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMessages } from '@/app/hooks/useMessages';
import { formatMessageGroupDate, getUrgencyConfig } from '@/app/lib/messages-utils';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TemplatePickerModal from './TemplatePickerModal';
import ClaimContextBar from './ClaimContextBar';

interface Props {
  conversationId: string;
  currentUserId:  string;
  onArchive:      (id: string, archived: boolean) => void;
  onUrgencyChange:(id: string, level: string) => void;
}

export default function ConversationView({ conversationId, currentUserId, onArchive, onUrgencyChange }: Props) {
  const { conversation, messages, isLoading, refresh } = useMessages(conversationId);
  const [showTemplates, setShowTemplates] = useState(false);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Mark as read when conversation is opened
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`/api/messages/conversations/${conversationId}/read`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {});
  }, [conversationId]);

  const handleSend = useCallback(async (content: string, visibility: string) => {
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/messages/conversations/${conversationId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ content, visibility }),
    });
    refresh();
  }, [conversationId, refresh]);

  const handleUrgency = async (level: string) => {
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/messages/conversations/${conversationId}/urgency`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ urgencyLevel: level }),
    });
    onUrgencyChange(conversationId, level);
    refresh();
  };

  const handleArchive = async () => {
    const newArchived = !conversation?.isArchived;
    const token = localStorage.getItem('adminToken');
    await fetch(`/api/messages/conversations/${conversationId}/archive`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ archived: newArchived }),
    });
    onArchive(conversationId, newArchived);
    refresh();
  };

  const urgencyConfig = conversation ? getUrgencyConfig(conversation.urgencyLevel as Parameters<typeof getUrgencyConfig>[0]) : null;

  // Group messages by date
  const grouped: { date: string; msgs: typeof messages }[] = [];
  for (const msg of messages) {
    const date = formatMessageGroupDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== date) grouped.push({ date, msgs: [msg] });
    else last.msgs.push(msg);
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">💬</div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-2">❌</div>
          <p>Conversation introuvable</p>
        </div>
      </div>
    );
  }

  const otherParticipants = conversation.participantDetails?.filter((p: { id?: string; userId?: string }) => (p.id ?? p.userId) !== currentUserId) ?? [];
  const displayTitle = conversation.subject
    ?? (otherParticipants.length > 0
      ? `${otherParticipants[0].firstName} ${otherParticipants[0].lastName}`
      : 'Conversation');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{displayTitle}</h3>
              {urgencyConfig && urgencyConfig.level !== 'NORMAL' && (
                <span className={`text-xs font-bold ${urgencyConfig.textColor} shrink-0`}>
                  {urgencyConfig.icon} {urgencyConfig.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {otherParticipants.map((p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`).join(', ')}
              {conversation.type && (
                <span className="ml-2 capitalize">&middot; {conversation.type.replace('_', ' ').toLowerCase()}</span>
              )}
            </p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={conversation.urgencyLevel}
            onChange={e => handleUrgency(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Élevé</option>
            <option value="URGENT">Urgent</option>
          </select>
          <button
            onClick={handleArchive}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-600"
          >
            {conversation.isArchived ? '📂 Désarchiver' : '📁 Archiver'}
          </button>
        </div>
      </div>

      {/* Claim context */}
      {conversation.claim && <ClaimContextBar claim={conversation.claim} />}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50">
        {grouped.map(group => (
          <div key={group.date}>
            <div className="flex items-center justify-center my-4">
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{group.date}</span>
            </div>
            {group.msgs.map((msg, i) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwnMessage={(msg.senderInfo?.id ?? msg.senderId) === currentUserId}
                showSender={i === 0 || (group.msgs[i - 1].senderInfo?.id ?? group.msgs[i - 1].senderId) !== (msg.senderInfo?.id ?? msg.senderId)}
              />
            ))}
          </div>
        ))}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Aucun message</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onOpenTemplates={() => setShowTemplates(true)}
        disabled={conversation.isArchived}
      />

      {showTemplates && (
        <TemplatePickerModal
          onSelect={text => setPendingContent(text)}
          onClose={() => setShowTemplates(false)}
          context={{
            claimNumber: conversation.claim?.claimNumber ?? '',
            claimType:   conversation.claim?.claimType ?? '',
          }}
        />
      )}
    </div>
  );
}
