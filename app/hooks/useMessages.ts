'use client';

import useSWR from 'swr';
import { useEffect, useRef } from 'react';
import { getPusherClient } from '@/app/lib/pusher-client';

export interface Message {
  id:          string;
  content:     string;
  senderId:    string | null;
  clientSenderId: string | null;
  visibility:  string;
  isUrgent:    boolean;
  attachments: string[];
  createdAt:   string;
  sender:      { userId: string; firstName: string; lastName: string; role: string | null } | null;
  clientSender: { clientId: string; firstName: string; lastName: string } | null;
  senderInfo:  { id: string; firstName: string; lastName: string; role: string; kind: 'staff' | 'client' };
  readReceipts: { userId: string; readAt: string }[];
}

async function fetchWithAuth(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Erreur chargement messages');
  return res.json();
}

export function useMessages(conversationId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    conversationId ? `/api/messages/conversations/${conversationId}?limit=100` : null,
    fetchWithAuth
  );

  const mutateRef = useRef(mutate);
  mutateRef.current = mutate;

  // Subscribe to Pusher channel for real-time updates
  useEffect(() => {
    if (!conversationId) return;

    let pusher: ReturnType<typeof getPusherClient> | null = null;
    try {
      pusher = getPusherClient();
      const channel = pusher.subscribe(`conversation-${conversationId}`);
      channel.bind('new-message', () => {
        mutateRef.current();
      });
    } catch { /* Pusher not configured in dev */ }

    return () => {
      try {
        pusher?.unsubscribe(`conversation-${conversationId}`);
      } catch { /* ignore */ }
    };
  }, [conversationId]);

  return {
    conversation:  data?.data ?? null,
    messages:      (data?.data?.messages ?? []) as Message[],
    isLoading,
    error,
    refresh:       mutate,
  };
}
