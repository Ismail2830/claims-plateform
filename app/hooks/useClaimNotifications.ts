'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRealTimeUpdates } from './useRealTimeUpdates';

export interface ClaimNotification {
  id: string;
  claimId: string;
  type: 'status_changed' | 'entity_updated' | 'entity_created' | 'assignment_changed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const STORAGE_KEY = 'claim_notifications';

function loadFromStorage(): ClaimNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: ClaimNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    // Keep only the latest 50 notifications
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
}

function buildNotification(event: any): ClaimNotification | null {
  if (event.entityType !== 'CLAIM') return null;
  if (event.type === 'connection_established') return null;

  const typeLabels: Record<string, string> = {
    status_changed: 'Claim Status Changed',
    entity_updated: 'Claim Updated',
    entity_created: 'New Claim Submitted',
    assignment_changed: 'Claim Assignment Changed',
    entity_deleted: 'Claim Removed',
    bulk_operation: 'Bulk Claim Operation',
  };

  const title = typeLabels[event.type] ?? 'Claim Notification';
  const message =
    event.data?.description ??
    (event.data?.newStatus
      ? `Status changed to ${event.data.newStatus}`
      : 'A claim has been modified');

  return {
    id: event.id,
    claimId: event.entityId,
    type: event.type,
    title,
    message,
    timestamp: event.timestamp,
    read: false,
    riskLevel: event.riskLevel ?? 'LOW',
  };
}

export function useClaimNotifications(clientId?: string) {
  const [notifications, setNotifications] = useState<ClaimNotification[]>([]);

  // Load persisted notifications on mount
  useEffect(() => {
    setNotifications(loadFromStorage());
  }, []);

  const addNotification = useCallback((notification: ClaimNotification) => {
    setNotifications((prev) => {
      // Avoid duplicates
      if (prev.some((n) => n.id === notification.id)) return prev;
      const updated = [notification, ...prev].slice(0, 50);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  useRealTimeUpdates({
    entityTypes: ['CLAIM'],
    onEvent: (event) => {
      // Client-side filter: only process events that belong to this client
      // If clientId is not yet known (auth loading), accept all to avoid missing events
      if (clientId && event.data?.clientId && event.data.clientId !== clientId) {
        return;
      }
      const notification = buildNotification(event);
      if (notification) addNotification(notification);
    },
  });

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveToStorage([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}
