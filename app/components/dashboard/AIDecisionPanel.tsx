'use client';

import React, { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  Bot,
  CheckCircle,
  XCircle,
  ArrowUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Shield,
  ClipboardCopy,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IGNORED_REASON_OPTIONS } from '@/lib/ai-decision/types';
import type { DecisionFactor } from '@/lib/ai-decision/types';

const CLAIM_TYPE_FR: Record<string, string> = {
  ACCIDENT:         'Accident',
  THEFT:            'Vol',
  FIRE:             'Incendie',
  WATER_DAMAGE:     'Dégât des eaux',
  NATURAL_DISASTER: 'Catastrophe naturelle',
  VANDALISM:        'Vandalisme',
  HEALTH:           'Santé',
  LIABILITY:        'Responsabilité',
  AUTO:             'Automobile',
  OTHER:            'Autre',
};

/** Replace any raw English claim type codes in a string with their French label */
function translateClaimTypes(text: string): string {
  return Object.entries(CLAIM_TYPE_FR).reduce(
    (str, [key, val]) => str.replaceAll(key, val),
    text,
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIDecisionRecord {
  id: string;
  claimId: string;
  recommendation: 'APPROVE' | 'REJECT' | 'ESCALATE';
  confidence: number;
  approveScore: number;
  rejectScore: number;
  escalateScore: number;
  factors: DecisionFactor[];
  reasoning: string;
  autoTriggered: boolean;
  followedByUser: boolean | null;
  ignoredReason: string | null;
  calculatedAt: string;
}

interface AIDecisionResponse {
  decision: AIDecisionRecord | null;
  isCalculating: boolean;
  canRecalculate: boolean;
}

interface Props {
  claimId: string;
  onDecisionMade: (decision: 'APPROVE' | 'REJECT' | 'ESCALATE') => void;
}

// ─── Helper: fetcher ─────────────────────────────────────────────────────────

async function fetcher(url: string): Promise<AIDecisionResponse> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') ?? '') : '';
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Erreur chargement décision IA');
  return res.json() as Promise<AIDecisionResponse>;
}

// ─── Factor icon ─────────────────────────────────────────────────────────────

function FactorIcon({ result }: { result: DecisionFactor['result'] }) {
  if (result === 'POSITIVE')  return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />;
  if (result === 'NEGATIVE')  return <XCircle     className="h-4 w-4 text-red-500   shrink-0" />;
  if (result === 'CRITICAL')  return <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />;
  return <Shield className="h-4 w-4 text-orange-400 shrink-0" />;
}

function factorTextClass(result: DecisionFactor['result']) {
  if (result === 'POSITIVE') return 'text-green-700';
  if (result === 'NEGATIVE') return 'text-red-600';
  if (result === 'CRITICAL') return 'text-red-700 font-semibold';
  return 'text-orange-600';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBar({
  confidence,
  color,
}: {
  confidence: number;
  color: string;
}) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-700`}
        style={{ width: `${confidence}%` }}
      />
    </div>
  );
}

function FactorList({ factors }: { factors: DecisionFactor[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? factors : factors.slice(0, 3);

  return (
    <div className="mt-3 space-y-1">
      {visible.map(f => (
        <div key={f.id} className="flex items-start gap-2 text-sm">
          <FactorIcon result={f.result} />
          <span className={factorTextClass(f.result)}>
            <span className="font-medium">{f.label} :</span> {translateClaimTypes(f.detail)}
          </span>
        </div>
      ))}
      {factors.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Réduire les facteurs
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Voir tous les facteurs ({factors.length})
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── IgnoreReasonModal ────────────────────────────────────────────────────────

function IgnoreReasonModal({
  claimId,
  open,
  onClose,
  onConfirm,
}: {
  claimId: string;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote]     = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') ?? '') : '';
      await fetch(`/api/claims/${claimId}/ai-decision/feedback`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          followedByUser: false,
          ignoredReason:  reason || undefined,
        }),
      });
      await globalMutate(`/api/claims/${claimId}/ai-decision`);
      onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pourquoi ignorer la recommandation IA&nbsp;?</DialogTitle>
          <DialogDescription>
            Optionnel — aide à améliorer le système
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <select
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choisir une raison (optionnel)</option>
              {Object.entries(IGNORED_REASON_OPTIONS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

          <textarea
              placeholder="Note supplémentaire (optionnel)"
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-800 text-white"
            >
              {loading ? 'Enregistrement...' : 'Continuer sans suivre la recommandation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIDecisionPanel({ claimId, onDecisionMade }: Props) {
  const key = `/api/claims/${claimId}/ai-decision`;
  const { data, isLoading, mutate } = useSWR<AIDecisionResponse>(key, fetcher, {
    revalidateOnFocus: false,
  });

  const [calculating, setCalculating]     = useState(false);
  const [showIgnoreModal, setShowIgnoreModal] = useState(false);
  const [ignoredConfirmed, setIgnoredConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCalculate() {
    setCalculating(true);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') ?? '') : '';
      await fetch(`/api/claims/${claimId}/ai-decision/calculate`, {
        method:  'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      await mutate();
    } finally {
      setCalculating(false);
    }
  }

  async function handleFollowRecommendation(rec: 'APPROVE' | 'REJECT' | 'ESCALATE') {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') ?? '') : '';
    // Fire-and-forget feedback
    fetch(`/api/claims/${claimId}/ai-decision/feedback`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ followedByUser: true }),
    }).catch(() => void 0);

    onDecisionMade(rec);
  }

  function handleCopySummary(reasoning: string) {
    navigator.clipboard.writeText(reasoning).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => void 0);
  }

  // ── Loading ──
  if (isLoading || calculating) {
    return (
      <Card className="border border-gray-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Bot className="h-4 w-4 animate-pulse" />
            <span>{calculating ? 'Analyse IA en cours...' : 'Chargement...'}</span>
          </div>
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const response = data;

  // ── No decision yet ──
  if (!response?.decision) {
    return (
      <Card className="border border-gray-200 bg-gray-50">
        <CardContent className="p-4 text-center space-y-3">
          <Bot className="h-8 w-8 text-gray-400 mx-auto" />
          <p className="text-sm text-gray-600">
            L&apos;analyse IA sera disponible dès que tous les documents requis seront validés.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCalculate}
            disabled={calculating}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Calculer maintenant
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { decision, canRecalculate } = response;
  const rec = decision.recommendation;

  // Panel color config per recommendation
  const panelConfig = {
    APPROVE: {
      bg:       'bg-green-50',
      border:   'border-green-300',
      label:    'APPROUVER',
      icon:     <CheckCircle className="h-6 w-6 text-green-600" />,
      textCls:  'text-green-700',
      barCls:   'bg-green-500',
      badgeCls: 'bg-green-100 text-green-800',
      btnCls:   'bg-green-600 hover:bg-green-700 text-white w-full',
      btnLabel: '✅ Approuver — Suivre la recommandation',
    },
    REJECT: {
      bg:       'bg-red-50',
      border:   'border-red-300',
      label:    'REFUSER',
      icon:     <XCircle className="h-6 w-6 text-red-600" />,
      textCls:  'text-red-700',
      barCls:   'bg-red-500',
      badgeCls: 'bg-red-100 text-red-800',
      btnCls:   'bg-red-600 hover:bg-red-700 text-white w-full',
      btnLabel: '❌ Refuser — Suivre la recommandation',
    },
    ESCALATE: {
      bg:       'bg-orange-50',
      border:   'border-orange-300',
      label:    'ESCALADER',
      icon:     <ArrowUp className="h-6 w-6 text-orange-600" />,
      textCls:  'text-orange-700',
      barCls:   'bg-orange-500',
      badgeCls: 'bg-orange-100 text-orange-800',
      btnCls:   'bg-orange-500 hover:bg-orange-600 text-white w-full',
      btnLabel: '⬆️ Escalader — Suivre la recommandation',
    },
  };

  const cfg = panelConfig[rec];

  return (
    <>
      <Card className={`border ${cfg.border} ${cfg.bg}`}>
        <CardHeader className="pb-2 pt-4 px-4">
          {/* Feedback banners */}
          {decision.followedByUser === true && (
            <div className="mb-2 rounded-md bg-green-100 border border-green-200 px-3 py-1.5 text-xs text-green-800 flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              Vous avez suivi cette recommandation
            </div>
          )}
          {decision.followedByUser === false && (
            <div className="mb-2 rounded-md bg-gray-100 border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
              ℹ️ Vous avez choisi de décider différemment
              {decision.ignoredReason && (
                <span className="ml-1">
                  — Raison&nbsp;: {IGNORED_REASON_OPTIONS[decision.ignoredReason] ?? decision.ignoredReason}
                </span>
              )}
            </div>
          )}

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <Bot className="h-4 w-4" />
              Recommandation IA
            </div>
            {canRecalculate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCalculate}
                disabled={calculating}
                className="h-7 gap-1 text-xs text-gray-500"
              >
                <RefreshCw className="h-3 w-3" />
                Recalculer
              </Button>
            )}
          </div>

          {/* Recommendation */}
          <div className="flex items-center justify-between mt-1">
            <div className={`flex items-center gap-2 text-xl font-bold ${cfg.textCls}`}>
              {cfg.icon}
              {cfg.label}
            </div>
            <Badge className={`${cfg.badgeCls} text-xs`}>
              Confiance&nbsp;: {decision.confidence}%
            </Badge>
          </div>

          {/* Confidence bar */}
          <ConfidenceBar confidence={decision.confidence} color={cfg.barCls} />
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {/* Reasoning */}
          <p className="text-sm text-gray-600 italic">{translateClaimTypes(decision.reasoning)}</p>

          {/* Escalate summary card */}
          {rec === 'ESCALATE' && (
            <div className="mt-3 bg-white border rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">
                  📋 Résumé pour le Manager Senior&nbsp;:
                </span>
                <button
                  onClick={() => handleCopySummary(decision.reasoning)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  <ClipboardCopy className="h-3 w-3" />
                  {copied ? 'Copié !' : 'Copier'}
                </button>
              </div>
              <p className="text-xs text-gray-600">{translateClaimTypes(decision.reasoning)}</p>
            </div>
          )}

          {/* Factors */}
          <FactorList factors={decision.factors} />

          {/* Action buttons (only if not yet followed) */}
          {decision.followedByUser === null && !ignoredConfirmed && (
            <div className="mt-4 space-y-2">
              <Button
                className={cfg.btnCls}
                onClick={() => handleFollowRecommendation(rec)}
              >
                {cfg.btnLabel}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowIgnoreModal(true)}
              >
                ⚖️ Décider autrement
              </Button>
            </div>
          )}

          {/* After ignored: show plain action buttons */}
          {(decision.followedByUser === false || ignoredConfirmed) && (
            <div className="mt-4 p-3 bg-white border rounded-lg">
              <p className="text-xs text-gray-500 mb-2">
                Vous pouvez maintenant décider indépendamment&nbsp;:
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={() => onDecisionMade('APPROVE')}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  onClick={() => onDecisionMade('REJECT')}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Refuser
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
                  onClick={() => onDecisionMade('ESCALATE')}
                >
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Escalader
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <IgnoreReasonModal
        claimId={claimId}
        open={showIgnoreModal}
        onClose={() => setShowIgnoreModal(false)}
        onConfirm={() => setIgnoredConfirmed(true)}
      />
    </>
  );
}
