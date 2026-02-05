// Real-time Updates API using Server-Sent Events
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Store active connections
const activeConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  lastEventId: string;
  filters: {
    entityTypes?: string[];
    actions?: string[];
    riskLevels?: string[];
  };
}>();

// Real-time event types
interface RealTimeEvent {
  id: string;
  type: 'entity_created' | 'entity_updated' | 'entity_deleted' | 'status_changed' | 'assignment_changed' | 'bulk_operation';
  entityType: 'USER' | 'CLIENT' | 'POLICY' | 'CLAIM';
  entityId: string;
  data: any;
  timestamp: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: 'SYSTEM' | 'USER' | 'SUPER_ADMIN';
}

// Event broadcaster
export class EventBroadcaster {
  private static instance: EventBroadcaster;
  
  static getInstance(): EventBroadcaster {
    if (!EventBroadcaster.instance) {
      EventBroadcaster.instance = new EventBroadcaster();
    }
    return EventBroadcaster.instance;
  }

  broadcast(event: RealTimeEvent) {
    const eventData = JSON.stringify(event);
    
    for (const [connectionId, connection] of activeConnections) {
      try {
        // Apply filters
        if (connection.filters.entityTypes && 
            !connection.filters.entityTypes.includes(event.entityType)) {
          continue;
        }
        
        if (connection.filters.actions && 
            !connection.filters.actions.includes(event.type)) {
          continue;
        }
        
        if (connection.filters.riskLevels && 
            !connection.filters.riskLevels.includes(event.riskLevel)) {
          continue;
        }

        // Send event
        connection.controller.enqueue(
          new TextEncoder().encode(`data: ${eventData}\n\n`)
        );
        
        connection.lastEventId = event.id;
      } catch (error) {
        console.error(`Error broadcasting to connection ${connectionId}:`, error);
        // Remove dead connection
        activeConnections.delete(connectionId);
      }
    }
  }

  async broadcastFromAuditLog(auditLogId: string) {
    try {
      const auditLog = await prisma.auditLog.findUnique({
        where: { logId: auditLogId },
        include: {
          claim: {
            select: {
              claimNumber: true,
              status: true,
              priority: true,
            },
          },
          userRef: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          clientRef: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!auditLog) return;

      // Map audit action to real-time event type
      let eventType: RealTimeEvent['type'] = 'entity_updated';
      switch (auditLog.action) {
        case 'CREATE':
          eventType = 'entity_created';
          break;
        case 'UPDATE':
          eventType = 'entity_updated';
          break;
        case 'DELETE':
          eventType = 'entity_deleted';
          break;
        case 'STATUS_CHANGE':
          eventType = 'status_changed';
          break;
        case 'ASSIGN':
        case 'UNASSIGN':
          eventType = 'assignment_changed';
          break;
        default:
          if (auditLog.entityId === 'BULK_OPERATION') {
            eventType = 'bulk_operation';
          }
      }

      const event: RealTimeEvent = {
        id: auditLog.logId,
        type: eventType,
        entityType: auditLog.entityType as any,
        entityId: auditLog.entityId,
        data: {
          description: auditLog.description,
          oldValues: auditLog.oldValues,
          newValues: auditLog.newValues,
          metadata: auditLog.metadata,
          claim: auditLog.claim,
          user: auditLog.userRef,
          client: auditLog.clientRef,
        },
        timestamp: auditLog.createdAt.toISOString(),
        riskLevel: auditLog.riskLevel as any,
        source: auditLog.userRef?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 
                auditLog.userRef ? 'USER' : 'SYSTEM',
      };

      this.broadcast(event);
    } catch (error) {
      console.error('Error broadcasting from audit log:', error);
    }
  }

  getConnectionCount(): number {
    return activeConnections.size;
  }

  removeConnection(connectionId: string) {
    activeConnections.delete(connectionId);
  }
}

// GET - Establish SSE connection for real-time updates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId') || `conn_${Date.now()}_${Math.random()}`;
  const lastEventId = searchParams.get('lastEventId') || '';
  
  // Parse filters
  const entityTypes = searchParams.get('entityTypes')?.split(',');
  const actions = searchParams.get('actions')?.split(',');
  const riskLevels = searchParams.get('riskLevels')?.split(',');

  const filters = {
    entityTypes,
    actions,
    riskLevels,
  };

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store connection
      activeConnections.set(connectionId, {
        controller,
        lastEventId,
        filters,
      });

      // Send initial connection confirmation
      const welcomeEvent = {
        id: `welcome_${Date.now()}`,
        type: 'connection_established',
        entityType: 'SYSTEM',
        entityId: connectionId,
        data: {
          message: 'Real-time connection established',
          connectionId,
          activeConnections: activeConnections.size,
        },
        timestamp: new Date().toISOString(),
        riskLevel: 'LOW',
        source: 'SYSTEM',
      };

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(welcomeEvent)}\n\n`)
      );

      // Send recent events if lastEventId is provided
      if (lastEventId) {
        sendRecentEvents(controller, lastEventId, filters);
      }

      // Send keep-alive every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(
            new TextEncoder().encode(`: keep-alive ${Date.now()}\n\n`)
          );
        } catch (error) {
          clearInterval(keepAlive);
          activeConnections.delete(connectionId);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        activeConnections.delete(connectionId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });
    },
    
    cancel() {
      activeConnections.delete(connectionId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Send recent events to catch up
async function sendRecentEvents(
  controller: ReadableStreamDefaultController,
  lastEventId: string,
  filters: any
) {
  try {
    const since = new Date(Date.now() - 5 * 60 * 1000); // Last 5 minutes
    
    const where: any = {
      createdAt: { gte: since },
    };

    if (filters.entityTypes) {
      where.entityType = { in: filters.entityTypes };
    }

    if (filters.riskLevels) {
      where.riskLevel = { in: filters.riskLevels };
    }

    const recentLogs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        claim: {
          select: { claimNumber: true, status: true },
        },
        userRef: {
          select: { firstName: true, lastName: true, role: true },
        },
      },
    });

    for (const log of recentLogs.reverse()) {
      if (log.logId === lastEventId) break;

      const event: RealTimeEvent = {
        id: log.logId,
        type: 'entity_updated',
        entityType: log.entityType as any,
        entityId: log.entityId,
        data: {
          description: log.description,
          metadata: log.metadata,
          claim: log.claim,
          user: log.userRef,
        },
        timestamp: log.createdAt.toISOString(),
        riskLevel: log.riskLevel as any,
        source: log.userRef?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SYSTEM',
      };

      controller.enqueue(
        new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    }
  } catch (error) {
    console.error('Error sending recent events:', error);
  }
}

// POST - Manually trigger real-time event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, entityType, entityId, data, riskLevel = 'LOW', source = 'USER' } = body;

    const event: RealTimeEvent = {
      id: `manual_${Date.now()}_${Math.random()}`,
      type,
      entityType,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      riskLevel,
      source,
    };

    EventBroadcaster.getInstance().broadcast(event);

    return NextResponse.json({
      success: true,
      message: 'Event broadcasted successfully',
      activeConnections: activeConnections.size,
    });
  } catch (error) {
    console.error('Error broadcasting manual event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to broadcast event' },
      { status: 500 }
    );
  }
}

// DELETE - Close specific connection
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json(
      { success: false, error: 'Connection ID is required' },
      { status: 400 }
    );
  }

  const connection = activeConnections.get(connectionId);
  if (connection) {
    try {
      connection.controller.close();
    } catch (error) {
      // Connection already closed
    }
    activeConnections.delete(connectionId);
  }

  return NextResponse.json({
    success: true,
    message: 'Connection closed',
    activeConnections: activeConnections.size,
  });
}