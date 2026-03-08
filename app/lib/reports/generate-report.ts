import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { prisma } from '@/app/lib/prisma';
import { Resend } from 'resend';
import { MonthlyReportPDF } from './pdf/MonthlyReportPDF';
import type { MonthlyReportData } from './pdf/MonthlyReportPDF';
import { generateMonthlyExcel } from './excel/MonthlyReportExcel';
import { REPORT_TYPE_LABELS, formatPeriod } from './report-utils';

// ─── Types (inline to avoid regeneration dependency) ─────────────────────────

type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';
type ReportType   =
  | 'MONTHLY_ACTIVITY' | 'SINISTRALITE' | 'FINANCIAL'
  | 'ACAPS_COMPLIANCE' | 'MANAGER_PERFORMANCE' | 'CUSTOM';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? 'ISM Assurance <noreply@ismassurance.com>';

// ─── Fetch report data from DB ────────────────────────────────────────────────

export async function fetchMonthlyData(
  dateFrom: Date,
  dateTo:   Date,
  generatorId?: string,
): Promise<MonthlyReportData> {
  const where = {
    createdAt: { gte: dateFrom, lte: dateTo },
  };

  const [
    totalClaims,
    claimsByStatus,
    claimsByType,
    allClaims,
    documents,
    generatorUser,
  ] = await Promise.all([
    prisma.claim.count({ where }),
    prisma.claim.groupBy({ by: ['status'], where, _count: true }),
    prisma.claim.groupBy({
      by: ['claimType'],
      where,
      _count: true,
      _sum: { estimatedAmount: true },
    }),
    prisma.claim.findMany({
      where,
      select: {
        createdAt:    true,
        updatedAt:    true,
        status:       true,
        riskScore:    true,
        fraudScore:   true,
        assignedUser: { select: { userId: true, firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.claimDocument.count({ where: { claim: where } }),
    generatorId
      ? prisma.user.findUnique({
          where: { userId: generatorId },
          select: { firstName: true, lastName: true },
        })
      : null,
  ]);

  // Resolved / pending claims
  const RESOLVED_STATUSES = ['APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED'] as const;
  const PENDING_STATUSES  = ['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION'] as const;

  const resolved = allClaims.filter((c) => (RESOLVED_STATUSES as readonly string[]).includes(c.status)).length;
  const pending  = allClaims.filter((c) => (PENDING_STATUSES  as readonly string[]).includes(c.status)).length;

  // Average processing days
  const resolvedClaims = allClaims.filter((c) => (RESOLVED_STATUSES as readonly string[]).includes(c.status));
  const avgProcessingDays =
    resolvedClaims.length > 0
      ? resolvedClaims.reduce((sum, c) => {
          const diff = c.updatedAt.getTime() - c.createdAt.getTime();
          return sum + diff / 86_400_000;
        }, 0) / resolvedClaims.length
      : 0;

  // AI stats — using riskScore (Decimal)
  const riskScores = allClaims
    .filter((c) => c.riskScore !== null)
    .map((c) => Number(c.riskScore));
  const avgRisk    = riskScores.length > 0 ? riskScores.reduce((a, b) => a + b, 0) / riskScores.length : 0;
  const highRisk   = riskScores.filter((s) => s >= 70).length;
  const mediumRisk = riskScores.filter((s) => s >= 40 && s < 70).length;
  const lowRisk    = riskScores.filter((s) => s < 40).length;
  const flaggedFraud = allClaims.filter((c) => c.fraudScore !== null && Number(c.fraudScore) >= 80).length;

  // Manager stats
  const managerMap = new Map<
    string,
    { name: string; role: string; assigned: number; resolved: number; totalDays: number }
  >();
  for (const c of allClaims) {
    if (!c.assignedUser) continue;
    const key  = c.assignedUser.userId;
    const name = `${c.assignedUser.firstName} ${c.assignedUser.lastName}`;
    const role = c.assignedUser.role;
    if (!managerMap.has(key)) managerMap.set(key, { name, role, assigned: 0, resolved: 0, totalDays: 0 });
    const entry = managerMap.get(key)!;
    entry.assigned++;
    if ((RESOLVED_STATUSES as readonly string[]).includes(c.status)) {
      entry.resolved++;
      entry.totalDays += (c.updatedAt.getTime() - c.createdAt.getTime()) / 86_400_000;
    }
  }

  const managers = Array.from(managerMap.values()).map((m) => ({
    name:             m.name,
    role:             m.role,
    assigned:         m.assigned,
    resolved:         m.resolved,
    avgDays:          m.resolved > 0 ? m.totalDays / m.resolved : 0,
    satisfactionRate: m.assigned > 0 ? (m.resolved / m.assigned) * 100 : 0,
  }));

  // Documents
  const [totalVerified, totalPending] = await Promise.all([
    prisma.claimDocument.count({ where: { claim: where, status: 'VERIFIED' } }),
    prisma.claimDocument.count({ where: { claim: where, status: { not: 'VERIFIED' } } }),
  ]);

  const generatedAt  = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return {
    period:       formatPeriod(dateFrom, dateTo),
    dateFrom:     dateFrom.toLocaleDateString('fr-FR'),
    dateTo:       dateTo.toLocaleDateString('fr-FR'),
    generatedAt,
    generatorName: generatorUser
      ? `${generatorUser.firstName} ${generatorUser.lastName}`
      : 'Système',
    summary: {
      totalClaims,
      newClaims:          totalClaims,
      resolvedClaims:     resolved,
      pendingClaims:      pending,
      avgProcessingDays,
      totalIndemnities:   0,
      avgRiskScore:       avgRisk,
    },
    claimsByType: claimsByType.map((ct) => ({
      type:   ct.claimType,
      count:  ct._count,
      amount: Number(ct._sum.estimatedAmount ?? 0),
    })),
    claimsByStatus: claimsByStatus.map((cs) => ({
      status: cs.status,
      count:  cs._count,
    })),
    managers,
    documents: {
      totalUploaded:       documents,
      totalVerified,
      pendingVerification: totalPending,
    },
    aiStats: {
      avgScore:    avgRisk,
      highRisk,
      mediumRisk,
      lowRisk,
      flaggedFraud,
    },
  };
}

// ─── Save file ────────────────────────────────────────────────────────────────

function ensureReportsDir() {
  const dir = join(process.cwd(), 'public', 'reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Core generator ───────────────────────────────────────────────────────────

export interface GenerateOptions {
  reportId:   string;
  type:       ReportType;
  format:     ReportFormat;
  dateFrom:   Date;
  dateTo:     Date;
  sections:   string[];
  recipients?: string[];
  generatorId?: string;
}

export async function generateReport(opts: GenerateOptions): Promise<{
  filePath: string;
  fileSize: number;
  downloadUrl: string;
}> {
  const data = await fetchMonthlyData(opts.dateFrom, opts.dateTo, opts.generatorId);
  const dir  = ensureReportsDir();

  let buffer: Buffer;
  let ext: string;
  let mimeType: string;

  if (opts.format === 'PDF') {
    buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(MonthlyReportPDF, { data }) as any,
    );
    ext      = 'pdf';
    mimeType = 'application/pdf';
  } else if (opts.format === 'EXCEL') {
    buffer   = await generateMonthlyExcel(data);
    ext      = 'xlsx';
    mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    // CSV — simple flat summary
    const lines = [
      'Indicateur,Valeur',
      `Total dossiers,${data.summary.totalClaims}`,
      `Nouveaux dossiers,${data.summary.newClaims}`,
      `Dossiers résolus,${data.summary.resolvedClaims}`,
      `Dossiers en attente,${data.summary.pendingClaims}`,
      `Délai moyen (jours),${data.summary.avgProcessingDays.toFixed(1)}`,
      `Score risque moyen,${data.summary.avgRiskScore.toFixed(1)}`,
    ];
    buffer   = Buffer.from(lines.join('\n'), 'utf-8');
    ext      = 'csv';
    mimeType = 'text/csv';
  }

  const filename    = `${opts.type.toLowerCase()}-${opts.reportId}.${ext}`;
  const fullPath    = join(dir, filename);
  writeFileSync(fullPath, buffer);

  const downloadUrl = `/reports/${filename}`;

  // Send email if recipients provided
  if (opts.recipients && opts.recipients.length > 0) {
    const typeLabel = REPORT_TYPE_LABELS[opts.type];
    await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      opts.recipients,
      subject: `${typeLabel} — ${data.period}`,
      html: `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint le <strong>${typeLabel}</strong> pour la période <strong>${data.period}</strong>.</p>
        <p>Ce rapport a été généré automatiquement par la plateforme ISM Assurance.</p>
        <br/>
        <p style="color:#64748b;font-size:12px;">Ce message est envoyé automatiquement. Merci de ne pas y répondre.</p>
      `,
      attachments: [
        {
          filename: `${typeLabel.replace(/\s+/g, '_')}_${data.period.replace(/\s+/g, '_')}.${ext}`,
          content: buffer,
        },
      ],
    });
  }

  return { filePath: fullPath, fileSize: buffer.length, downloadUrl };
}
