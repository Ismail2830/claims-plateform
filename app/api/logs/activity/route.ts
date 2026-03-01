import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token required' },
        { status: 401 }
      );
    }

    // Verify token using the correct access secret
    let decoded: ReturnType<typeof verifyAccessToken>;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.type !== 'CLIENT') {
      return NextResponse.json(
        { success: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Get query parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get client's activity logs
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { 
          clientId: decoded.clientId,
          // Only show client-relevant actions
          action: { 
            in: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'UPLOAD'] 
          }
        },
        select: {
          logId: true,
          entityType: true,
          action: true,
          description: true,
          createdAt: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ 
        where: { 
          clientId: decoded.clientId,
          action: { 
            in: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'UPLOAD'] 
          }
        }
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    });

  } catch (error) {
    console.error('Activity logs error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}