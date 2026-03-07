'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Paperclip, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanClaim {
  claimId: string;
  claimNumber: string;
  typeSinistre: string;
  montantDeclare: number;
  priority: string;
  status: string;
  createdAt: string | Date;
  client: {
    nom: string;
    prenom: string;
    telephone: string;
  };
  assignedManager: {
    userId: string;
    nom: string;
    prenom: string;
    role: string;
    avatarInitials: string;
  } | null;
  scoreRisque: number | null;
  labelRisque: string | null;
  _count: { claimDocuments: number };
  verifiedDocsCount: number;
  totalRequiredDocs: number;
}

interface ClaimKanbanCardProps {
  claim: KanbanClaim;
  onClick: () => void;
  canDrag?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('fr-MA')} MAD`;
}

export function getRelativeTime(date: Date | string): { text: string; isLate: boolean } {
  const created = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Aujourd'hui", isLate: false };
  if (diffDays === 1) return { text: 'Il y a 1 jour', isLate: false };
  return { text: `Il y a ${diffDays} jours`, isLate: diffDays > 7 };
}

export function getRiskConfig(score: number | null, label: string | null) {
  if (score === null) {
    return { color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', text: 'Non scoré' };
  }
  if (score <= 30) return { color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  text: label ?? 'Faible' };
  if (score <= 60) return { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', text: label ?? 'Moyen' };
  if (score <= 80) return { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', text: label ?? 'Élevé' };
  return               { color: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    text: label ?? 'Suspicieux' };
}

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  AUTO:     { label: 'AUTO',   icon: '🚗' },
  HOME:     { label: 'HABITATION', icon: '🏠' },
  HEALTH:   { label: 'SANTÉ', icon: '🏥' },
  LIFE:     { label: 'VIE',   icon: '💙' },
  ACCIDENT: { label: 'ACCIDENT', icon: '⚠️' },
  THEFT:    { label: 'VOL',   icon: '🔒' },
  FIRE:     { label: 'INCENDIE', icon: '🔥' },
  WATER_DAMAGE: { label: 'DÉGÂTS EAU', icon: '💧' },
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:     'Super Admin',
  MANAGER_SENIOR:  'Manager Senior',
  MANAGER_JUNIOR:  'Manager Junior',
  EXPERT:          'Expert',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ClaimKanbanCard({ claim, onClick, canDrag = false }: ClaimKanbanCardProps) {
  const router = useRouter();

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: claim.claimId,
    data: { claim },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const { text: timeText, isLate } = getRelativeTime(claim.createdAt);
  const riskCfg = getRiskConfig(claim.scoreRisque, claim.labelRisque);
  const typeCfg = TYPE_CONFIG[claim.typeSinistre] ?? { label: claim.typeSinistre, icon: '📄' };
  const docsComplete = claim.verifiedDocsCount >= claim.totalRequiredDocs;
  const docsIncomplete = claim.totalRequiredDocs > 0 && !docsComplete;

  const now = new Date();
  const createdAt = typeof claim.createdAt === 'string' ? new Date(claim.createdAt) : claim.createdAt;
  const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const isUnassignedAndOld = !claim.assignedManager && hoursOld > 48;

  const handleClick = () => {
    router.push(`/dashboard/super-admin/claims/${claim.claimId}`);
    onClick();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      onClick={handleClick}
      className={[
        'bg-white rounded-lg border p-3 shadow-sm',
        'hover:shadow-md transition-all duration-150',
        'cursor-pointer select-none',
        isDragging
          ? 'opacity-50 shadow-xl border-blue-400 rotate-1 z-50'
          : isUnassignedAndOld
          ? 'border-red-400 border-2'
          : 'border-gray-200 hover:border-blue-200',
      ].join(' ')}
    >
      {/* Row 1: Claim number + Risk badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-xs text-gray-400">{claim.claimNumber}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${riskCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${riskCfg.dot}`} />
          {claim.scoreRisque !== null ? `${claim.scoreRisque}` : '—'}
        </span>
      </div>

      {/* Row 2: Client name */}
      <p className="font-medium text-sm text-gray-800 mb-1.5 truncate">
        {claim.client.prenom} {claim.client.nom}
      </p>

      {/* Row 3: Type badge + amount */}
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          <span>{typeCfg.icon}</span>
          {typeCfg.label}
        </span>
        <span className="text-xs font-semibold text-gray-700">
          {formatAmount(claim.montantDeclare)}
        </span>
      </div>

      {/* Row 4: Divider */}
      <div className="border-t border-gray-100 mb-2" />

      {/* Row 5: Manager */}
      {claim.assignedManager ? (
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{claim.assignedManager.avatarInitials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-700 truncate font-medium">
              {claim.assignedManager.prenom} {claim.assignedManager.nom}
            </p>
            <p className="text-xs text-gray-400">{ROLE_LABELS[claim.assignedManager.role] ?? claim.assignedManager.role}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 mb-2">
          {isUnassignedAndOld ? (
            <Badge variant="outline" className="text-xs text-red-600 border-red-300 bg-red-50">
              ⚠️ Non assigné
            </Badge>
          ) : (
            <span className="text-xs text-gray-400 italic">Non assigné</span>
          )}
        </div>
      )}

      {/* Row 6: Time + docs */}
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 ${isLate ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          <Clock className="h-3 w-3 shrink-0" />
          {timeText}
        </span>
        <span className={`flex items-center gap-1 ${docsIncomplete ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
          <Paperclip className="h-3 w-3 shrink-0" />
          {claim.verifiedDocsCount}/{claim.totalRequiredDocs} docs
        </span>
      </div>

      {/* Row 7: Priority badge (only if HIGH or URGENT) */}
      {(claim.priority === 'HIGH' || claim.priority === 'URGENT') && (
        <div className="mt-2">
          <Badge
            className={[
              'text-xs rounded-full gap-1',
              claim.priority === 'URGENT'
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-orange-100 text-orange-700 border-orange-200',
            ].join(' ')}
            variant="outline"
          >
            <AlertTriangle className="h-3 w-3" />
            {claim.priority === 'URGENT' ? 'URGENTE' : 'HAUTE'}
          </Badge>
        </div>
      )}
    </div>
  );
}
