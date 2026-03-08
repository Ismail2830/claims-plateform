'use client';

import { formatMessageTime, getVisibilityConfig } from '@/app/lib/messages-utils';
import type { Message } from '@/app/hooks/useMessages';

interface Props {
  message:       Message;
  isOwnMessage:  boolean;
  showSender:    boolean;
}

export default function MessageBubble({ message: m, isOwnMessage, showSender }: Props) {
  const visConfig = getVisibilityConfig(m.visibility as Parameters<typeof getVisibilityConfig>[0]);

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} mb-1`}>
      {showSender && !isOwnMessage && (() => {
        const si = m.senderInfo ?? (m.sender ? { firstName: m.sender.firstName, lastName: m.sender.lastName, role: m.sender.role ?? '', kind: 'staff' as const } : null);
        if (!si) return null;
        return (
          <span className="text-xs text-gray-500 ml-2 mb-0.5">
            {si.firstName} {si.lastName}
            {si.kind === 'client'
              ? <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Client</span>
              : si.role && <span className="text-gray-400"> · {si.role.replace(/_/g, ' ')}</span>
            }
          </span>
        );
      })()}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isOwnMessage
            ? m.isUrgent
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
            : m.isUrgent
              ? 'bg-red-50 border border-red-200 text-gray-900'
              : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        {m.isUrgent && (
          <div className={`text-xs font-bold mb-1 ${isOwnMessage ? 'text-red-100' : 'text-red-600'}`}>
            🔥 URGENT
          </div>
        )}
        <p className="whitespace-pre-wrap overflow-wrap-break-word">{m.content}</p>
        {m.attachments.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {m.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs underline ${isOwnMessage ? 'text-blue-100' : 'text-blue-600'}`}
              >
                📎 Pièce jointe {i + 1}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 px-1">
        <span className="text-xs text-gray-400">{formatMessageTime(m.createdAt)}</span>
        {m.visibility !== 'ALL' && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${visConfig.bg} ${visConfig.text}`}>
            {visConfig.label}
          </span>
        )}
        {isOwnMessage && m.readReceipts.length > 0 && (
          <span className="text-xs text-blue-400">✓✓</span>
        )}
      </div>
    </div>
  );
}
