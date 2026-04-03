/**
 * GET /api/manager-senior/staff — all active experts + manager juniors (for add-member dropdown)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR'])
  if (!auth.ok) return auth.response

  const users = await prisma.user.findMany({
    where: { role: { in: ['EXPERT', 'MANAGER_JUNIOR'] }, isActive: true },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      currentWorkload: true,
    },
    orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
  })

  return NextResponse.json({ success: true, data: { users } })
}
