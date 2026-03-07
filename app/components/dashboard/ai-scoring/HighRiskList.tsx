'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { RiskBadge } from '@/components/sinistres/RiskBadge';
import { cn } from '@/lib/utils';

export interface HighRiskClaim {
  id:              string;
  claimNumber:     string;
  clientName:      string;
  typeSinistre:    string;
  montantDeclare:  number | null;
  scoreRisque:     number | null;
  labelRisque:     string | null;
  decisionIa:      string | null;
}

interface HighRiskListProps {
  claims:  HighRiskClaim[];
  limit?:  number;
}

const CLAIM_TYPE_FR: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégâts des eaux',
};

const LABEL_DISPLAY: Record<string, string> = {
  FAIBLE:     'Faible',
  MOYEN:      'Moyen',
  ELEVE:      'Élevé',
  SUSPICIEUX: 'Suspicieux',
};

const DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  AUTO_APPROUVER:    { label: 'Auto-approuvé', className: 'bg-green-100  text-green-700' },
  REVISION_MANUELLE: { label: 'Révision',      className: 'bg-yellow-100 text-yellow-700' },
  ESCALADER:         { label: 'Escalader',     className: 'bg-red-100    text-red-700' },
};

export function HighRiskList({ claims, limit = 5 }: HighRiskListProps) {
  const router  = useRouter();
  const visible = claims.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2 text-center">
        <CheckCircle className="w-10 h-10 text-green-400" />
        <p className="text-sm font-medium text-green-700">Aucun dossier à risque élevé</p>
        <p className="text-xs text-gray-400">La plateforme affiche un profil de risque sain.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {visible.map(claim => {
        const displayLabel  = LABEL_DISPLAY[claim.labelRisque ?? ''] ?? claim.labelRisque ?? '—';
        const decisionCfg   = DECISION_CONFIG[claim.decisionIa ?? ''];

        return (
          <div
            key={claim.id}
            className="flex items-center justify-between px-1 py-3 hover:bg-gray-50 rounded-lg transition-colors group"
          >
            <div className="flex items-start space-x-3 min-w-0">
              {/* Score circle */}
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white',
                (claim.scoreRisque ?? 0) >= 80 ? 'bg-red-500'    :
                (claim.scoreRisque ?? 0) >= 61 ? 'bg-orange-500' :
                'bg-yellow-500',
              )}>
                {claim.scoreRisque ?? '—'}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{claim.claimNumber}</p>
                <p className="text-xs text-gray-500 truncate">{claim.clientName}</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <RiskBadge label={displayLabel} score={claim.scoreRisque ?? 0} size="sm" />
                  <span className="text-xs text-gray-400">
                    {CLAIM_TYPE_FR[claim.typeSinistre] ?? claim.typeSinistre}
                  </span>
                  {claim.montantDeclare && (
                    <span className="text-xs text-gray-500 font-medium">
                      {claim.montantDeclare.toLocaleString('fr-MA', { maximumFractionDigits: 0 })} MAD
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 ml-2">
              {decisionCfg && (
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium hidden sm:inline-flex', decisionCfg.className)}>
                  {decisionCfg.label}
                </span>
              )}
              <button
                onClick={() => router.push(`/dashboard/super-admin/claims?id=${claim.id}`)}
                className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span>Traiter</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
