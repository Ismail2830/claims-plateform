import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';

// ─── Enum of all platform audit actions ──────────────────────────────────────
export const PlatformAuditAction = {
  // Claims
  CLAIM_CREATED:         'CLAIM_CREATED',
  CLAIM_UPDATED:         'CLAIM_UPDATED',
  CLAIM_APPROVED:        'CLAIM_APPROVED',
  CLAIM_REJECTED:        'CLAIM_REJECTED',
  CLAIM_ESCALATED:       'CLAIM_ESCALATED',
  CLAIM_CLOSED:          'CLAIM_CLOSED',
  // Settings
  SETTINGS_UPDATED:      'SETTINGS_UPDATED',
  // Users
  USER_CREATED:          'USER_CREATED',
  USER_UPDATED:          'USER_UPDATED',
  USER_DEACTIVATED:      'USER_DEACTIVATED',
  USER_ROLE_CHANGED:     'USER_ROLE_CHANGED',
  // Auth
  LOGIN_SUCCESS:         'LOGIN_SUCCESS',
  LOGIN_FAILED:          'LOGIN_FAILED',
  LOGOUT:                'LOGOUT',
  SESSION_REVOKED:       'SESSION_REVOKED',
  PASSWORD_CHANGED:      'PASSWORD_CHANGED',
  // Reports
  REPORT_GENERATED:      'REPORT_GENERATED',
  REPORT_EXPORTED:       'REPORT_EXPORTED',
  // Documents
  DOCUMENT_UPLOADED:     'DOCUMENT_UPLOADED',
  DOCUMENT_APPROVED:     'DOCUMENT_APPROVED',
  DOCUMENT_REJECTED:     'DOCUMENT_REJECTED',
  // Finance
  INVOICE_CREATED:       'INVOICE_CREATED',
  PAYMENT_RECORDED:      'PAYMENT_RECORDED',
} as const;

export type PlatformAuditActionType = typeof PlatformAuditAction[keyof typeof PlatformAuditAction];

export interface LogActionParams {
  action: string;
  resourceType?: string;
  resourceId?: string;
  resourceRef?: string;
  userId?: string;
  userFullName?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

/**
 * Logs a platform audit event.
 * Designed to be non-blocking — wrap in .catch() if calling from critical paths.
 */
export async function logPlatformAction(params: LogActionParams): Promise<void> {
  let ip = params.ipAddress;
  let ua = params.userAgent;

  if (!ip || !ua) {
    try {
      const hdrs = await headers();
      ip = ip ?? hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? 'unknown';
      ua = ua ?? hdrs.get('user-agent') ?? 'unknown';
    } catch {
      ip = ip ?? 'unknown';
      ua = ua ?? 'unknown';
    }
  }

  await prisma.platformAuditLog.create({
    data: {
      action:       params.action,
      resourceType: params.resourceType ?? null,
      resourceId:   params.resourceId   ?? null,
      resourceRef:  params.resourceRef  ?? null,
      userId:       params.userId       ?? null,
      userFullName: params.userFullName ?? null,
      userRole:     params.userRole     ?? null,
      ipAddress:    ip,
      userAgent:    ua,
      status:       params.status ?? 'SUCCESS',
      metadata:     params.metadata
        ? params.metadata as unknown as Prisma.InputJsonValue
        : undefined,
    },
  });
}
