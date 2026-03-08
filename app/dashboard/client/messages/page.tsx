'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/app/components/dashboard/ClientLayout';
import { Shield, FileText, PlusCircle, CheckCircle, MessageSquare, Send, RefreshCw } from 'lucide-react';

interface Conversation {
  id:           string;
  subject:      string | null;
  lastMessage:  string | null;
  lastMessageAt: string | null;
  urgencyLevel: string;
  unreadCount:  number;
  type:         string;
}

interface Message {
  id:                string;
  content:           string;
  senderId:          string | null;
  clientSenderId:    string | null;
  effectiveSenderId: string;
  createdAt:         string;
  sender:            { firstName: string; lastName: string; role: string };
}

export default function ClientMessagesPage() {
  const { user, token, isLoading } = useSimpleAuth();
  const router = useRouter();

  const [conversations, setConversations]     = useState<Conversation[]>([]);
  const [convLoading, setConvLoading]         = useState(true);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [msgLoading, setMsgLoading]           = useState(false);
  const [replyText, setReplyText]             = useState('');
  const [sending, setSending]                 = useState(false);
  const bottomRef                             = useRef<HTMLDivElement>(null);

  const selected = conversations.find(c => c.id === selectedId);

  useEffect(() => {
    if (!isLoading && (!token || !user)) {
      router.replace('/auth/login');
    }
  }, [isLoading, token, user, router]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    setConvLoading(true);
    try {
      const res = await fetch('/api/client/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { success?: boolean; data?: Conversation[] };
      setConversations(data.data ?? []);
    } catch { /* ignore */ }
    finally { setConvLoading(false); }
  }, [token]);

  useEffect(() => {
    if (token) loadConversations();
  }, [token, loadConversations]);

  const loadMessages = useCallback(async (id: string) => {
    if (!token) return;
    setMsgLoading(true);
    try {
      const res = await fetch(`/api/client/messages/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { success?: boolean; data?: { messages: Message[] } };
      setMessages(data.data?.messages ?? []);
      // Mark conversation unread count as 0 locally
      setConversations(cs => cs.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ }
    finally { setMsgLoading(false); }
  }, [token]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedId || sending) return;
    setSending(true);
    const content = replyText.trim();
    setReplyText('');
    try {
      const res = await fetch(`/api/client/messages/${selectedId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ content }),
      });
      const data = await res.json() as { success?: boolean; data?: Message };
      if (data.success && data.data) {
        setMessages(ms => [...ms, {
          ...data.data!,
          sender: { firstName: user?.firstName ?? 'Vous', lastName: user?.lastName ?? '', role: 'CLIENT' },
        }]);
        setConversations(cs => cs.map(c =>
          c.id === selectedId ? { ...c, lastMessage: content, lastMessageAt: new Date().toISOString() } : c
        ));
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const urgencyColor = (level: string) => {
    if (level === 'URGENT') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'HIGH')   return 'text-orange-600 bg-orange-50 border-orange-200';
    return '';
  };

  return (
    <ClientLayout>
      <div className="flex h-[calc(100vh-4rem)] bg-white rounded-xl border border-gray-200 overflow-hidden">

        {/* Left: conversation list */}
        <div className="w-80 border-r border-gray-100 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Messagerie</h2>
            <button onClick={loadConversations} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            )}
            {!convLoading && conversations.length === 0 && (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Aucun message pour le moment</p>
                <p className="text-xs text-gray-400 mt-1">Votre conseiller vous contactera ici</p>
              </div>
            )}
            {conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === c.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm text-gray-800 truncate">
                    {c.subject ?? (c.type === 'CLIENT' ? 'Question client' : 'Conversation')}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">{formatTime(c.lastMessageAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 truncate flex-1">{c.lastMessage ?? '...'}</p>
                  {c.unreadCount > 0 && (
                    <span className="shrink-0 text-xs bg-blue-600 text-white rounded-full px-1.5 py-0.5 font-medium">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                {c.urgencyLevel !== 'NORMAL' && (
                  <span className={`mt-1 inline-block text-xs px-1.5 py-0.5 rounded border font-medium ${urgencyColor(c.urgencyLevel)}`}>
                    {c.urgencyLevel === 'URGENT' ? '🔴 Urgent' : '🟠 Élevé'}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: messages thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
              <MessageSquare className="w-12 h-12 text-gray-300" />
              <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-3 border-b border-gray-100 bg-white">
                <h3 className="font-semibold text-gray-800">
                  {selected?.subject ?? 'Conversation'}
                </h3>
                {selected?.urgencyLevel !== 'NORMAL' && (
                  <span className={`text-xs font-medium ${selected?.urgencyLevel === 'URGENT' ? 'text-red-600' : 'text-orange-600'}`}>
                    {selected?.urgencyLevel === 'URGENT' ? '🔴 Urgent' : '🟠 Priorité élevée'}
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                {msgLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                  </div>
                )}
                {!msgLoading && messages.map(m => {
                  const isMe = m.effectiveSenderId === user?.clientId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        {!isMe && (
                          <span className="text-xs text-gray-500 px-1">
                            {m.sender.firstName} {m.sender.lastName}
                            {m.sender.role !== 'CLIENT' && (
                              <span className="ml-1 text-gray-400">· {m.sender.role.replace(/_/g, ' ')}</span>
                            )}
                          </span>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                          {m.content}
                        </div>
                        <span className="text-xs text-gray-400 px-1">{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <div className="border-t border-gray-100 px-4 py-3 bg-white flex gap-3 items-end">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message... (Entrée pour envoyer)"
                  rows={2}
                  className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="shrink-0 bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
