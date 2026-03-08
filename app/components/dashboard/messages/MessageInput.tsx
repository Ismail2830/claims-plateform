'use client';

import { useState, useRef, useCallback } from 'react';
import VisibilitySelector from './VisibilitySelector';

interface Props {
  onSend: (content: string, visibility: string) => Promise<void>;
  onOpenTemplates: () => void;
  disabled?: boolean;
}

export default function MessageInput({ onSend, onOpenTemplates, disabled }: Props) {
  const [content, setContent]       = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [sending, setSending]       = useState(false);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text, visibility);
      setContent('');
      textareaRef.current?.focus();
    } finally {
      setSending(false);
    }
  }, [content, visibility, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <VisibilitySelector value={visibility} onChange={setVisibility} />
        <button
          type="button"
          onClick={onOpenTemplates}
          className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          📋 Modèles
        </button>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message... (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
          disabled={disabled || sending}
          rows={2}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {sending ? '...' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}
