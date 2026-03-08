'use client';

import useSWR from 'swr';

export interface ConversationFilters {
  type?:       string;
  unreadOnly?: boolean;
  urgentOnly?: boolean;
  archived?:   boolean;
  search?:     string;
  page?:       number;
}

async function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error('Erreur chargement conversations');
  return res.json();
}

export function useConversations(filters: ConversationFilters = {}) {
  const params = new URLSearchParams();
  if (filters.type)        params.set('type', filters.type);
  if (filters.unreadOnly)  params.set('unreadOnly', 'true');
  if (filters.urgentOnly)  params.set('urgentOnly', 'true');
  if (filters.archived)    params.set('archived', 'true');
  if (filters.search)      params.set('search', filters.search);
  if (filters.page)        params.set('page', String(filters.page));

  const { data, error, isLoading, mutate } = useSWR(
    `/api/messages/conversations?${params.toString()}`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  return {
    conversations:    (data?.data?.conversations ?? []) as Conversation[],
    total:            (data?.data?.total ?? 0) as number,
    pages:            (data?.data?.pages ?? 1) as number,
    isLoading,
    error,
    refresh:          mutate,
  };
}

export interface Conversation {
  id:            string;
  type:          string;
  subject:       string | null;
  lastMessage:   string | null;
  lastMessageAt: string;
  urgencyLevel:  string;
  isArchived:    boolean;
  unreadCount:   number;
  participants:  { userId: string; firstName: string; lastName: string; role: string | null }[];
  claim:         { claimId: string; claimNumber: string; claimType: string; claimedAmount: number | null; status: string; scoreRisque: number | null } | null;
}
