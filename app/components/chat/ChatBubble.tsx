'use client'

import { Bot } from 'lucide-react'

interface Props {
  role: 'USER' | 'BOT' | 'SYSTEM'
  content: string
  timestamp?: Date
}

export default function ChatBubble({ role, content, timestamp }: Props) {
  if (role === 'SYSTEM') return null

  const isBot = role === 'BOT'

  return (
    <div className={`flex items-end gap-2 ${isBot ? 'justify-start' : 'justify-end'} animate-fadeIn`}>
      {isBot && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isBot
            ? 'bg-blue-50 border border-blue-100 text-gray-800 rounded-tl-none'
            : 'bg-blue-600 text-white rounded-tr-none'
        }`}
      >
        {/* Render **bold** markdown-lite */}
        <span
          dangerouslySetInnerHTML={{
            __html: content
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br/>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
          }}
        />
        {timestamp && (
          <p className={`text-[10px] mt-1 ${isBot ? 'text-gray-400' : 'text-blue-200'}`}>
            {timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
