'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  emails:      string[];
  onChange:    (emails: string[]) => void;
  placeholder?: string;
  className?:  string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function EmailTagInput({ emails, onChange, placeholder, className }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmail = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    if (!isValidEmail(email)) {
      setError('Email invalide');
      return;
    }
    if (emails.includes(email)) {
      setError('Déjà ajouté');
      return;
    }
    onChange([...emails, email]);
    setInput('');
    setError('');
  };

  const removeEmail = (email: string) => onChange(emails.filter((e) => e !== email));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === 'Backspace' && !input && emails.length > 0) {
      removeEmail(emails[emails.length - 1]);
    } else {
      setError('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    const parts  = pasted.split(/[,;\s]+/).filter(Boolean);
    if (parts.length > 1) {
      e.preventDefault();
      const valid = parts.filter(isValidEmail).map((s) => s.trim().toLowerCase());
      const unique = valid.filter((v) => !emails.includes(v));
      if (unique.length > 0) onChange([...emails, ...unique]);
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        'flex min-h-10 flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 cursor-text',
        'focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition',
        className,
      )}
    >
      {emails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800"
        >
          {email}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
            className="hover:text-blue-600 ml-0.5 leading-none"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="email"
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(''); }}
        onKeyDown={handleKey}
        onBlur={() => { if (input) addEmail(input); }}
        onPaste={handlePaste}
        placeholder={emails.length === 0 ? (placeholder ?? 'Ajouter un email…') : ''}
        className="flex-1 min-w-32 bg-transparent text-sm outline-none placeholder-gray-400"
      />
      {error && (
        <div className="w-full text-xs text-red-500 mt-0.5">{error}</div>
      )}
    </div>
  );
}
