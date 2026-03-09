'use client';

import { ProactiveRiskData } from '@/app/lib/predictions/prediction-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, UserCheck, Search } from 'lucide-react';
import { RiskEvolutionBar } from './RiskEvolutionBar';
import { SignalBadge } from './SignalBadge';

interface ProactiveRiskCardProps {
  claim: ProactiveRiskData;
  onAssign: (claimId: string) => void;
  onViewClaim: (claimId: string) => void;
}

const claimTypeLabels: Record<string, string> = {
  ACCIDENT: 'Accident',
  THEFT: 'Vol',
  FIRE: 'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

function urgencyBadge(score: number) {
  if (score >= 80) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs border">🔴 Critique</Badge>;
  if (score >= 60) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs border">🟠 Élevé</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs border">🟡 Moyen</Badge>;
}

export function ProactiveRiskCard({ claim, onAssign, onViewClaim }: ProactiveRiskCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Row 1: Claim info */}
      <div className="flex items-center gap-3 mb-2">
        <span className="font-mono text-sm font-semibold text-gray-800">{claim.claimNumber}</span>
        <Badge variant="outline" className="text-xs">
          {claimTypeLabels[claim.claimType] ?? claim.claimType}
        </Badge>
        {urgencyBadge(claim.evolvedScore)}
      </div>

      {/* Row 2: Client + amount */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
        <span className="font-medium">{claim.clientName}</span>
        {claim.claimedAmount > 0 && (
          <>
            <span className="text-gray-300">•</span>
            <span>{new Intl.NumberFormat('fr-FR').format(claim.claimedAmount)} MAD</span>
          </>
        )}
      </div>

      {/* Row 3: Risk evolution */}
      <div className="mb-3">
        <RiskEvolutionBar
          originalScore={claim.originalScore}
          evolvedScore={claim.evolvedScore}
        />
      </div>

      {/* Row 4: Signal badges */}
      {claim.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {claim.signals.map((s, i) => (
            <SignalBadge key={i} signal={s} />
          ))}
        </div>
      )}

      {/* Row 5: Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onViewClaim(claim.claimId)}>
          <Eye className="w-3 h-3" />
          Voir dossier
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAssign(claim.claimId)}>
          <UserCheck className="w-3 h-3" />
          Assigner expert senior
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
          <Search className="w-3 h-3" />
          Demander expertise
        </Button>
      </div>
    </div>
  );
}
