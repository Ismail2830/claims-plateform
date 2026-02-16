// Real-time updates hook for Super Admin dashboard
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface RealTimeEvent {
  id: string;
  type: 'entity_created' | 'entity_updated' | 'entity_deleted' | 'status_changed' | 'assignment_changed' | 'bulk_operation' | 'connection_established';
  entityType: 'USER' | 'CLIENT' | 'POLICY' | 'CLAIM' | 'SYSTEM';
  entityId: string;
  data: any;
  timestamp: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: 'SYSTEM' | 'USER' | 'SUPER_ADMIN';
}

interface UseRealTimeOptions {
  entityTypes?: string[];
  actions?: string[];
  riskLevels?: string[];
  autoReconnect?: boolean;
  onEvent?: (event: RealTimeEvent) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface RealTimeState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastEvent: RealTimeEvent | null;
  connectionCount: number;
  events: RealTimeEvent[];
}

export function useRealTimeUpdates(options: UseRealTimeOptions = {}) {
  const [state, setState] = useState<RealTimeState>({
    connected: false,
    connecting: false,
    error: null,
    lastEvent: null,
    connectionCount: 0,
    events: [],
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const connectionIdRef = useRef<string>(`conn_${Date.now()}_${Math.random()}`);
  const lastEventIdRef = useRef<string>('');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  // Create refs for callback functions to avoid dependency issues
  const onEventRef = useRef(options.onEvent);
  const onErrorRef = useRef(options.onError);
  const onConnectRef = useRef(options.onConnect);
  const onDisconnectRef = useRef(options.onDisconnect);
  
  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = options.onEvent;
    onErrorRef.current = options.onError;
    onConnectRef.current = options.onConnect;
    onDisconnectRef.current = options.onDisconnect;
  });
  
  const {
    entityTypes,
    actions,
    riskLevels,
    autoReconnect = true,
  } = options;

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    setState(prev => ({ ...prev, connecting: true, error: null }));

    // Build URL with filters
    const params = new URLSearchParams({
      connectionId: connectionIdRef.current,
      lastEventId: lastEventIdRef.current,
    });

    if (entityTypes?.length) {
      params.set('entityTypes', entityTypes.join(','));
    }
    if (actions?.length) {
      params.set('actions', actions.join(','));
    }
    if (riskLevels?.length) {
      params.set('riskLevels', riskLevels.join(','));
    }

    const url = `/api/real-time?${params.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setState(prev => ({
        ...prev,
        connected: true,
        connecting: false,
        error: null,
      }));
      reconnectAttempts.current = 0;
      onConnectRef.current?.();
    };

    eventSource.onmessage = (event) => {
      try {
        // Skip keep-alive messages
        if (!event.data || event.data.trim() === '') {
          return;
        }
        
        // Check if the data looks like JSON before parsing
        const data = event.data.trim();
        if (!data.startsWith('{') && !data.startsWith('[')) {
          console.warn('Received non-JSON data from EventSource:', data);
          return;
        }
        
        const realTimeEvent: RealTimeEvent = JSON.parse(data);
        
        setState(prev => ({
          ...prev,
          lastEvent: realTimeEvent,
          events: [realTimeEvent, ...prev.events].slice(0, 100), // Keep last 100 events
          connectionCount: realTimeEvent.type === 'connection_established' 
            ? realTimeEvent.data.activeConnections 
            : prev.connectionCount,
        }));

        lastEventIdRef.current = realTimeEvent.id;
        onEventRef.current?.(realTimeEvent);
      } catch (error) {
        console.error('Error parsing real-time event:', {
          error: error instanceof Error ? error.message : String(error),
          data: event.data,
          eventType: typeof event.data
        });
      }
    };

    eventSource.onerror = (error) => {
      // Only log if it's not a normal connection close
      if (eventSource.readyState !== EventSource.CLOSED) {
        console.warn('EventSource connection issue:', {
          readyState: eventSource.readyState,
          url: url
        });
      }
      
      setState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: eventSource.readyState === EventSource.CLOSED ? null : 'Connection error',
      }));

      onErrorRef.current?.(error);
      onDisconnectRef.current?.();

      // Auto-reconnect with exponential backoff
      if (autoReconnect && reconnectAttempts.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    eventSourceRef.current = eventSource;
  }, [entityTypes, actions, riskLevels, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connected: false,
      connecting: false,
    }));

    onDisconnectRef.current?.();
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  const clearEvents = useCallback(() => {
    setState(prev => ({ ...prev, events: [] }));
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []); // Empty dependency array since connect/disconnect are now stable

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !state.connected && autoReconnect) {
        reconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.connected, autoReconnect, reconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
    clearEvents,
    connectionId: connectionIdRef.current,
  };
}

// Entity-specific hooks
export function useUserUpdates() {
  return useRealTimeUpdates({
    entityTypes: ['USER'],
  });
}

export function useClientUpdates() {
  return useRealTimeUpdates({
    entityTypes: ['CLIENT'],
  });
}

export function usePolicyUpdates() {
  return useRealTimeUpdates({
    entityTypes: ['POLICY'],
  });
}

export function useClaimUpdates() {
  return useRealTimeUpdates({
    entityTypes: ['CLAIM'],
  });
}

export function useCriticalUpdates() {
  return useRealTimeUpdates({
    riskLevels: ['HIGH', 'CRITICAL'],
  });
}

// Helper function to format event for display
export function formatRealTimeEvent(event: RealTimeEvent): string {
  const timestamp = new Date(event.timestamp).toLocaleTimeString();
  
  switch (event.type) {
    case 'entity_created':
      return `${timestamp} - ${event.entityType} created: ${event.data.description}`;
    case 'entity_updated':
      return `${timestamp} - ${event.entityType} updated: ${event.data.description}`;
    case 'entity_deleted':
      return `${timestamp} - ${event.entityType} deleted: ${event.data.description}`;
    case 'status_changed':
      return `${timestamp} - Status changed: ${event.data.description}`;
    case 'assignment_changed':
      return `${timestamp} - Assignment changed: ${event.data.description}`;
    case 'bulk_operation':
      return `${timestamp} - Bulk operation: ${event.data.description}`;
    default:
      return `${timestamp} - ${event.data.description || 'Unknown event'}`;
  }
}

// Risk level color mapping
export function getRiskLevelColor(riskLevel: RealTimeEvent['riskLevel']): string {
  switch (riskLevel) {
    case 'LOW':
      return 'text-green-600 bg-green-100';
    case 'MEDIUM':
      return 'text-yellow-600 bg-yellow-100';
    case 'HIGH':
      return 'text-orange-600 bg-orange-100';
    case 'CRITICAL':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}