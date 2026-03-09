import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

interface CronJob {
  name:        string;
  schedule:    string;
  lastRun:     string | null;
  nextRun:     string;
  status:      'ok' | 'warning' | 'error';
  description: string;
}

// Static list of known cron jobs in the platform
const CRON_JOBS: CronJob[] = [
  {
    name:        'cleanup-expired-sessions',
    schedule:    '0 * * * *',
    lastRun:     null,
    nextRun:     '',
    status:      'ok',
    description: 'Supprime les sessions expirées',
  },
  {
    name:        'sla-check',
    schedule:    '*/30 * * * *',
    lastRun:     null,
    nextRun:     '',
    status:      'ok',
    description: 'Vérifie les délais SLA des sinistres ouverts',
  },
  {
    name:        'report-generation',
    schedule:    '0 8 * * *',
    lastRun:     null,
    nextRun:     '',
    status:      'ok',
    description: 'Génère les rapports quotidiens',
  },
  {
    name:        'ai-scoring-batch',
    schedule:    '0 2 * * *',
    lastRun:     null,
    nextRun:     '',
    status:      'ok',
    description: 'Recalcule les scores IA en lot',
  },
];

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ success: true, data: CRON_JOBS });
}
