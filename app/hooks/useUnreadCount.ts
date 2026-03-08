'use client';

import useSWR from 'swr';

async function fetcher(url: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) return { data: { totalUnread: 0 } };
  return res.json();
}

export function useUnreadCount() {
  const { data } = useSWR('/api/messages/stats', fetcher, { refreshInterval: 15_000 });

  return {
    totalUnread:            (data?.data?.totalUnread        ?? 0) as number,
    urgentUnread:           (data?.data?.urgentUnread       ?? 0) as number,
    clientConversations:    (data?.data?.clientConversations    ?? 0) as number,
    internalConversations:  (data?.data?.internalConversations  ?? 0) as number,
    escalationsPending:     (data?.data?.escalationsPending     ?? 0) as number,
  };
}
