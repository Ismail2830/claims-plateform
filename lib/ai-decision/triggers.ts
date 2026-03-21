// ─── AI Decision Triggers ─────────────────────────────────────────────────────
// Auto-trigger decision calculation when all required documents are approved.
// Called from document status update and document upload routes.

import { prisma } from '@/app/lib/prisma';
import { computeAndSaveDecision } from './decision-service';

// Document types required per claim type (mirrors decision-engine.ts)
const REQUIRED_DOCS: Record<string, string[]> = {
  AUTO:         ['PHOTO_DEGATS', 'PERMIS_CONDUIRE'],
  FIRE:         ['PHOTO_DEGATS'],
  WATER_DAMAGE: ['PHOTO_DEGATS'],
  THEFT:        ['POLICE_REPORT'],
  ACCIDENT:     ['PHOTO_DEGATS', 'RAPPORT_MEDICAL'],
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Call this after a document status change, document upload, or claim update.
 * Calculates a new AI decision if:
 *  1. All REQUIRED docs for this claim type are VERIFIED (or claim type has no required docs)
 *  2. No existing decision, OR existing decision is older than 24h, OR force=true
 *
 * Pass force=true when real data has changed (new document uploaded, claim fields updated)
 * to bypass the 24h cooldown so the decision reflects the latest state immediately.
 */
export async function triggerDecisionIfReady(claimId: string, force = false): Promise<void> {
  try {
    const claim = await prisma.claim.findUnique({
      where:   { claimId },
      include: {
        documents: {
          where:  { isArchived: false },
          select: { fileType: true, status: true },
        },
        aiDecision: { select: { calculatedAt: true } },
      },
    });

    if (!claim) return;

    const required = REQUIRED_DOCS[claim.claimType] ?? [];

    // Check all required docs are approved
    const approvedTypes: string[] = claim.documents
      .filter(d => d.status === 'VERIFIED')
      .map(d => d.fileType as string);

    const allRequiredApproved = required.every(r => approvedTypes.includes(r));

    // If any required doc is missing or not approved, skip
    if (required.length > 0 && !allRequiredApproved) return;

    // Check if we should recalculate
    const existing = claim.aiDecision;
    if (existing && !force) {
      const age = Date.now() - existing.calculatedAt.getTime();
      if (age < ONE_DAY_MS) return; // too recent, skip
    }

    // Fire and forget — do not block the caller
    computeAndSaveDecision(claimId, true).catch((err: unknown) => {
      console.error('[AI Decision] Auto-trigger failed for claim', claimId, err);
    });
  } catch (err) {
    // Never block the caller
    console.error('[AI Decision] triggerDecisionIfReady error', err);
  }
}
