import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';
import os from 'os';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const [
    totalClaims,
    totalUsers,
    totalDocuments,
    activeSessions,
  ] = await Promise.all([
    prisma.claim.count(),
    prisma.user.count(),
    prisma.claimDocument.count(),
    prisma.activeSession.count({ where: { expiresAt: { gt: new Date() } } }),
  ]);

  const totalMem  = os.totalmem();
  const freeMem   = os.freemem();
  const usedMem   = totalMem - freeMem;
  const memPercent = Math.round((usedMem / totalMem) * 100);

  const uptimeSeconds = os.uptime();
  const uptimeDays    = Math.floor(uptimeSeconds / 86400);
  const uptimeHours   = Math.floor((uptimeSeconds % 86400) / 3600);

  // CPU load (1-min average on *nix; returns [] on Windows)
  const loadAvg = os.loadavg();
  const cpuPercent = loadAvg[0]
    ? Math.min(100, Math.round(loadAvg[0] * 10))
    : null;

  return NextResponse.json({
    success: true,
    data: {
      status: 'healthy',
      uptimeDays,
      uptimeHours,
      database:       { status: 'ok', totalClaims, totalUsers, totalDocuments },
      memory:         { percent: memPercent, usedMB: Math.round(usedMem / 1024 / 1024), totalMB: Math.round(totalMem / 1024 / 1024) },
      cpu:            { percent: cpuPercent },
      activeSessions,
    },
  });
}
