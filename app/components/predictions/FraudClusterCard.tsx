'use client';

import { useState } from 'react';
import { FraudClusterAlert, FraudMetadata } from '@/app/lib/predictions/prediction-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Search, AlertOctagon, CheckCircle } from 'lucide-react';
import { PredictionConfidenceBadge } from './PredictionConfidenceBadge';

interface FraudClusterCardProps {
  alert: FraudClusterAlert;
  onInvestigate: (alertId: string) => void;
  onEscalate: (alertId: string) => void;
  onDismiss: (alertId: string, note?: string) => Promise<void>;
}

export function FraudClusterCard({ alert, onInvestigate, onEscalate, onDismiss }: FraudClusterCardProps) {
  const [claimsExpanded, setClaimsExpanded] = useState(false);
  const [dismissModal, setDismissModal] = useState(false);
  const [dismissNote, setDismissNote] = useState('');
  const [dismissing, setDismissing] = useState(false);

  const metadata = alert.metadata as FraudMetadata | null;
  const claimIds = metadata?.claimIds ?? [];
  const confidence = metadata?.confidence ?? 0.7;
  const affectedAmount = metadata?.affectedAmount;
  const claimCount = metadata?.claimCount ?? claimIds.length;

  const isCritical = alert.severity === 'CRITICAL';
  const timeAgo = formatTimeAgo(new Date(alert.createdAt));

  async function handleDismiss() {
    setDismissing(true);
    try {
      await onDismiss(alert.id, dismissNote || undefined);
      setDismissModal(false);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <>
      <div className={`bg-white border rounded-xl p-4 mb-3 shadow-sm ${isCritical ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs border font-semibold ${isCritical ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
              {isCritical ? '🔴 CRITIQUE' : '🟠 AVERTISSEMENT'}
            </Badge>
            <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{timeAgo}</span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-700 mb-3">{alert.description}</p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-4 mb-3 text-sm">
          {claimCount > 0 && (
            <div className="flex items-center gap-1 text-gray-600">
              <AlertOctagon className="w-4 h-4 text-orange-500" />
              <span><strong>{claimCount}</strong> sinistres concernés</span>
              {metadata?.historicalMultiple && (
                <span className="text-red-600 font-medium">— {metadata.historicalMultiple}x la normale</span>
              )}
            </div>
          )}
          {affectedAmount && affectedAmount > 0 && (
            <div className="text-gray-600">
              Montant exposé: <strong>{new Intl.NumberFormat('fr-FR').format(affectedAmount)} MAD</strong>
            </div>
          )}
        </div>

        {/* Affected claims (collapsible) */}
        {claimIds.length > 0 && (
          <Collapsible open={claimsExpanded} onOpenChange={setClaimsExpanded}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2">
              {claimsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {claimsExpanded ? 'Masquer les dossiers' : `Voir les dossiers concernés (${claimIds.length})`}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1.5 pb-2">
                {claimIds.map((id, i) => (
                  <a
                    key={i}
                    href={`/dashboard/manager/claims/${id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-0.5 rounded border border-gray-200 transition-colors"
                  >
                    {id}
                  </a>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Confidence */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">Confiance:</span>
          <Progress value={confidence * 100} className="w-24 h-1.5" />
          <PredictionConfidenceBadge confidence={confidence} showLabel={false} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onInvestigate(alert.id)}>
            <Search className="w-3 h-3" />
            Créer enquête groupée
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => onEscalate(alert.id)}>
            <AlertOctagon className="w-3 h-3" />
            Escalader ACAPS
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-500 ml-auto" onClick={() => setDismissModal(true)}>
            <CheckCircle className="w-3 h-3" />
            Faux positif
          </Button>
        </div>
      </div>

      {/* Dismiss dialog */}
      <Dialog open={dismissModal} onOpenChange={setDismissModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marquer comme faux positif</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">Motif (optionnel):</p>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Ex: Vérification effectuée — sinistres légitimes identifiés"
              value={dismissNote}
              onChange={e => setDismissNote(e.target.value.slice(0, 500))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDismissModal(false)} disabled={dismissing}>Annuler</Button>
            <Button onClick={handleDismiss} disabled={dismissing}>
              {dismissing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'il y a moins d\'1h';
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}
