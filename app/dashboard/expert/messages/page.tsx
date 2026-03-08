'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import ConversationList from '@/app/components/dashboard/messages/ConversationList';
import ConversationView from '@/app/components/dashboard/messages/ConversationView';
import NewConversationModal from '@/app/components/dashboard/messages/NewConversationModal';
import { useUnreadCount } from '@/app/hooks/useUnreadCount';
import { useConversations } from '@/app/hooks/useConversations';

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAdminAuth();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showNewConv, setShowNewConv]   = useState(false);
  const stats = useUnreadCount();
  const { refresh } = useConversations();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/admin?reason=session_expired');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  const handleUrgencyChange = (_id: string, _level: string) => { refresh(); };
  const handleArchive = (_id: string, _archived: boolean) => { refresh(); };

  return (
    <RoleBasedLayout role="EXPERT" user={user} onLogout={logout}>
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
        <div className="w-80 shrink-0">
          <ConversationList
            currentUserId={user.userId}
            activeConversationId={activeConvId}
            onSelect={setActiveConvId}
            onNewConversation={() => setShowNewConv(true)}
          />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {activeConvId ? (
            <ConversationView
              conversationId={activeConvId}
              currentUserId={user.userId}
              onArchive={handleArchive}
              onUrgencyChange={handleUrgencyChange}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="text-lg font-medium text-gray-500">Messagerie interne</p>
              <p className="text-sm mt-1">Sélectionnez une conversation ou créez-en une nouvelle</p>
              {stats.totalUnread > 0 && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-center">
                  <p className="text-blue-700 font-semibold">{stats.totalUnread} message{stats.totalUnread > 1 ? 's' : ''} non lu{stats.totalUnread > 1 ? 's' : ''}</p>
                  {stats.urgentUnread > 0 && (
                    <p className="text-red-600 text-sm mt-0.5">🔥 {stats.urgentUnread} urgent{stats.urgentUnread > 1 ? 's' : ''}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowNewConv(true)}
                className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                + Nouvelle conversation
              </button>
            </div>
          )}
        </div>
        {showNewConv && (
          <NewConversationModal
            currentUserId={user.userId}
            onClose={() => setShowNewConv(false)}
            onCreated={id => { setActiveConvId(id); refresh(); }}
          />
        )}
      </div>
    </RoleBasedLayout>
  );
}
