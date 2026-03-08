import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

/**
 * GET /api/messages/participants?search=&includeClients=true
 * Returns a unified list of staff users + clients for participant selection.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const search         = searchParams.get('search') ?? '';
  const includeClients = searchParams.get('includeClients') !== 'false'; // default true

  if (search.length < 1) {
    return NextResponse.json({ success: true, data: [] });
  }

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
          { email:     { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { userId: true, firstName: true, lastName: true, email: true, role: true },
      take: 15,
    }),
    includeClients
      ? prisma.client.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName:  { contains: search, mode: 'insensitive' } },
              { email:     { contains: search, mode: 'insensitive' } },
            ],
          },
          select: { clientId: true, firstName: true, lastName: true, email: true },
          take: 15,
        })
      : Promise.resolve([]),
  ]);

  const results = [
    ...users.map(u => ({
      id:        u.userId,
      firstName: u.firstName,
      lastName:  u.lastName,
      email:     u.email,
      role:      u.role,
      kind:      'staff' as const,
    })),
    ...clients.map(c => ({
      id:        c.clientId,
      firstName: c.firstName,
      lastName:  c.lastName,
      email:     c.email,
      role:      'CLIENT',
      kind:      'client' as const,
    })),
  ];

  return NextResponse.json({ success: true, data: results });
}
