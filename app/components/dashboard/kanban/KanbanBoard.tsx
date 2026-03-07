'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { KanbanColumn, KanbanColumnId } from './KanbanColumn';
import { ClaimKanbanCard, KanbanClaim, formatAmount, getRelativeTime, getRiskConfig } from './ClaimKanbanCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KanbanFilters {
  typeSinistre?: string;
  managerId?: string;
  priority?: string;
}

export type KanbanData = Record<KanbanColumnId, KanbanClaim[]>;

interface KanbanBoardProps {
  data: KanbanData;
  filters: KanbanFilters;
  loading: boolean;
  onCardClick: (claimId: string) => void;
  canDrag?: boolean;
  onOptimisticMove: (claimId: string, fromCol: KanbanColumnId, toCol: KanbanColumnId) => void;
}

// ─── Column configuration ─────────────────────────────────────────────────────

interface ColumnConfig {
  id:          KanbanColumnId;
  title:       string;
  color:       string;
  bgColor:     string;
  borderColor: string;
  countBg:     string;
  countText:   string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'DECLARED',
    title: 'DÉCLARÉ',
    color: '#6B7280',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-400',
    countBg: 'bg-gray-200',
    countText: 'text-gray-700',
  },
  {
    id: 'IN_PROGRESS',
    title: 'EN COURS',
    color: '#2563eb',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    countBg: 'bg-blue-100',
    countText: 'text-blue-800',
  },
  {
    id: 'DECISION',
    title: 'DÉCISION',
    color: '#D97706',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    countBg: 'bg-yellow-100',
    countText: 'text-yellow-800',
  },
  {
    id: 'APPROVED',
    title: 'APPROUVÉ',
    color: '#16A34A',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    countBg: 'bg-green-100',
    countText: 'text-green-800',
  },
  {
    id: 'REJECTED',
    title: 'REJETÉ',
    color: '#DC2626',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    countBg: 'bg-red-100',
    countText: 'text-red-800',
  },
  {
    id: 'ESCALATED',
    title: 'ESCALADÉ',
    color: '#7C3AED',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
    countBg: 'bg-purple-100',
    countText: 'text-purple-800',
  },
];

// ─── List View Row ─────────────────────────────────────────────────────────────

function ListViewRow({ claim, onNavigate }: { claim: KanbanClaim; onNavigate: (id: string) => void }) {
  const { text: timeText, isLate } = getRelativeTime(claim.createdAt);
  const riskCfg = getRiskConfig(claim.scoreRisque, claim.labelRisque);

  const STATUS_LABELS: Record<string, string> = {
    DECLARED: 'Déclaré', ANALYZING: 'En cours', DOCS_REQUIRED: 'Docs requis',
    UNDER_EXPERTISE: 'En expertise', IN_DECISION: 'Décision',
    APPROVED: 'Approuvé', IN_PAYMENT: 'En paiement', CLOSED: 'Clôturé', REJECTED: 'Rejeté',
  };

  const COLUMN_STATUS_LABEL: Record<string, string> = {
    DECLARED: 'Déclaré', IN_PROGRESS: 'En cours', DECISION: 'Décision',
    APPROVED: 'Approuvé', REJECTED: 'Rejeté', ESCALATED: 'Escaladé',
  };

  const displayStatus = COLUMN_STATUS_LABEL[claim.status] ?? STATUS_LABELS[claim.status] ?? claim.status;

  const STATUS_COLORS: Record<string, string> = {
    DECLARED: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    DECISION: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    ESCALATED: 'bg-purple-100 text-purple-700',
  };

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onNavigate(claim.claimId)}
    >
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{claim.claimNumber}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-800">
        {claim.client.prenom} {claim.client.nom}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{claim.typeSinistre}</td>
      <td className="px-4 py-3 text-xs text-gray-700 font-medium">{formatAmount(claim.montantDeclare)}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${riskCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${riskCfg.dot}`} />
          {claim.scoreRisque !== null ? claim.scoreRisque : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">
        {claim.assignedManager
          ? `${claim.assignedManager.prenom} ${claim.assignedManager.nom}`
          : <span className="text-gray-400 italic">Non assigné</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[claim.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {displayStatus}
        </span>
      </td>
      <td className={`px-4 py-3 text-xs ${isLate ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{timeText}</td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(claim.claimId); }}
          className="text-xs text-blue-600 hover:underline"
        >
          Voir
        </button>
      </td>
    </tr>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function KanbanBoard({
  data,
  filters,
  loading,
  onCardClick,
  canDrag = false,
  onOptimisticMove,
}: KanbanBoardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [localData, setLocalData] = useState<KanbanData>(data);
  const [activeClaim, setActiveClaim] = useState<KanbanClaim | null>(null);

  // Sync when parent data changes (after SWR refresh)
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Helper: which column does a claim currently live in?
  function findColumn(claimId: string): KanbanColumnId | null {
    for (const col of COLUMNS) {
      if (localData[col.id].some((c) => c.claimId === claimId)) return col.id;
    }
    return null;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const claim = (event.active.data.current as { claim: KanbanClaim }).claim;
    setActiveClaim(claim);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveClaim(null);
      const { active, over } = event;
      if (!over) return;

      const claimId = active.id as string;
      const toCol = over.id as KanbanColumnId;
      const fromCol = findColumn(claimId);

      if (!fromCol || fromCol === toCol) return;

      // Get the claim object
      const movedClaim = localData[fromCol].find((c) => c.claimId === claimId);
      if (!movedClaim) return;

      // Optimistic UI update
      setLocalData((prev) => {
        const updated = { ...prev };
        updated[fromCol] = prev[fromCol].filter((c) => c.claimId !== claimId);
        updated[toCol] = [{ ...movedClaim, status: toCol }, ...prev[toCol]];
        return updated;
      });
      onOptimisticMove(claimId, fromCol, toCol);

      // API call
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
        const res = await fetch(`/api/sinistres/${claimId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: toCol }),
        });

        if (!res.ok) {
          // Revert on error
          setLocalData((prev) => {
            const reverted = { ...prev };
            reverted[toCol]   = prev[toCol].filter((c) => c.claimId !== claimId);
            reverted[fromCol] = [movedClaim, ...prev[fromCol]];
            return reverted;
          });
        }
      } catch {
        // Revert on network error
        setLocalData((prev) => {
          const reverted = { ...prev };
          reverted[toCol]   = prev[toCol].filter((c) => c.claimId !== claimId);
          reverted[fromCol] = [movedClaim, ...prev[fromCol]];
          return reverted;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [localData, onOptimisticMove]
  );

  const allClaims = COLUMNS.flatMap((col) => localData[col.id]);

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div>
        {/* View toggle embedded top-right */}
        <div className="flex justify-end mb-3">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['DOSSIER', 'CLIENT', 'TYPE', 'MONTANT', 'SCORE IA', 'MANAGER', 'STATUT', 'DATE', 'ACTIONS'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : allClaims.map((claim) => (
                      <ListViewRow
                        key={claim.claimId}
                        claim={claim}
                        onNavigate={(id) => router.push(`/dashboard/super-admin/claims/${id}`)}
                      />
                    ))}
                {!loading && allClaims.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                      Aucun dossier actif trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Kanban view ────────────────────────────────────────────────────────────
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* View toggle embedded top-right */}
      <div className="flex justify-end mb-3">
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-h-150" style={{ minWidth: 'max-content' }}>
          {COLUMNS.map((col) => {
            const claims = localData[col.id];
            const totalAmount = claims.reduce((sum, c) => sum + c.montantDeclare, 0);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                claims={claims}
                color={col.color}
                bgColor={col.bgColor}
                borderColor={col.borderColor}
                countBg={col.countBg}
                countText={col.countText}
                totalAmount={totalAmount}
                loading={loading}
                onCardClick={onCardClick}
                canDrag={canDrag}
              />
            );
          })}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeClaim ? (
          <div className="rotate-2 opacity-90 pointer-events-none">
            <ClaimKanbanCard
              claim={activeClaim}
              onClick={() => {}}
              canDrag={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── View Toggle (used inside both views) ─────────────────────────────────────

function ViewToggle({
  viewMode,
  setViewMode,
}: {
  viewMode: 'kanban' | 'list';
  setViewMode: (v: 'kanban' | 'list') => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setViewMode('kanban')}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
          viewMode === 'kanban'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50',
        ].join(' ')}
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={[
          'flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors',
          viewMode === 'list'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50',
        ].join(' ')}
      >
        <List className="h-4 w-4" />
        Liste
      </button>
    </div>
  );
}
