'use client';

import React from 'react';
import { Folder } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useDroppable } from '@dnd-kit/core';
import { ClaimKanbanCard, KanbanClaim, formatAmount } from './ClaimKanbanCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type KanbanColumnId =
  | 'DECLARED'
  | 'IN_PROGRESS'
  | 'DECISION'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED';

interface KanbanColumnProps {
  id: KanbanColumnId;
  title: string;
  claims: KanbanClaim[];
  color: string;          // hex e.g. "#2563eb"
  bgColor: string;        // tailwind bg class e.g. "bg-blue-50"
  borderColor: string;    // tailwind border class e.g. "border-blue-400"
  countBg: string;        // tailwind badge bg e.g. "bg-blue-100"
  countText: string;      // tailwind badge text e.g. "text-blue-800"
  totalAmount: number;
  loading: boolean;
  onCardClick: (claimId: string) => void;
  canDrag?: boolean;
}

// ─── Loading skeletons ─────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-4 w-32" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanColumn({
  id,
  title,
  claims,
  color,
  bgColor,
  borderColor,
  countBg,
  countText,
  totalAmount,
  loading,
  onCardClick,
  canDrag = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isEscalated = id === 'ESCALATED';

  return (
    <div className="flex flex-col min-w-70 max-w-70">
      {/* Column header */}
      <div
        className={`rounded-t-lg ${bgColor} border-l-4 px-3 py-2.5 mb-0`}
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-800">{title}</span>
            {/* Pulsing badge for ESCALADÉ when count > 0 */}
            {isEscalated && claims.length > 0 ? (
              <span className="relative inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold">
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                <span className="relative">{claims.length}</span>
              </span>
            ) : (
              <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-semibold ${countBg} ${countText}`}>
                {claims.length}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">{formatAmount(totalAmount)}</p>
      </div>

      {/* Drop zone + cards */}
      <div
        ref={setNodeRef}
        className={[
          'flex-1 rounded-b-lg p-2 overflow-y-auto max-h-[calc(100vh-340px)] space-y-2.5',
          bgColor,
          isOver ? `ring-2 ring-inset ${borderColor}` : '',
        ].join(' ')}
      >
        {loading ? (
          <ColumnSkeleton />
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-gray-200">
            <Folder className="h-6 w-6 text-gray-300 mb-1" />
            <p className="text-xs text-gray-400">Aucun dossier</p>
          </div>
        ) : (
          claims.map((claim) => (
            <ClaimKanbanCard
              key={claim.claimId}
              claim={claim}
              onClick={() => onCardClick(claim.claimId)}
              canDrag={canDrag}
            />
          ))
        )}
      </div>

      {/* Column footer: total */}
      {!loading && claims.length > 0 && (
        <div className={`rounded-b-lg ${bgColor} px-3 py-1.5 border-t border-gray-200`}>
          <p className="text-xs text-gray-500">
            Total: <span className="font-medium">{formatAmount(totalAmount)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
