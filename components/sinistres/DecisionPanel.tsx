'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DecisionValue = 'AUTO_APPROUVER' | 'REVISION_MANUELLE' | 'ESCALADER';

interface DecisionPanelProps {
  decision: DecisionValue | string;
  confidence: number;
  canOverride?: boolean;
  onOverride?: (newDecision: DecisionValue) => Promise<void> | void;
  className?: string;
}

type DecisionConfig = {
  icon: string;
  label: string;
  description: string;
  why: string;
  headerBg: string;
  iconBg: string;
  iconText: string;
  border: string;
};

const DECISION_CONFIG: Record<string, DecisionConfig> = {
  AUTO_APPROUVER: {
    icon: '✅',
    label: 'Approbation automatique',
    description: 'Ce sinistre peut être traité automatiquement sans intervention manuelle.',
    why: 'Le score de risque est faible, les informations sont cohérentes et le profil client est stable. Aucun indicateur de fraude n\'a été détecté.',
    headerBg: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconText: 'text-green-700',
    border: 'border-green-200',
  },
  REVISION_MANUELLE: {
    icon: '⚠️',
    label: 'Révision manuelle requise',
    description: 'Ce sinistre nécessite une vérification humaine avant toute décision.',
    why: 'Le score de risque est modéré ou des éléments nécessitent une vérification supplémentaire. Une validation manuelle est recommandée pour éviter les erreurs.',
    headerBg: 'bg-yellow-50',
    iconBg: 'bg-yellow-100',
    iconText: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  ESCALADER: {
    icon: '🚨',
    label: 'Escalade vers un expert',
    description: 'Ce sinistre présente des signaux à haut risque et doit être escaladé.',
    why: 'Le score de risque est élevé ou des indicateurs de fraude potentielle ont été détectés. Un expert doit examiner ce dossier en priorité.',
    headerBg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconText: 'text-red-700',
    border: 'border-red-200',
  },
};

const FALLBACK_CONFIG: DecisionConfig = {
  icon: '❓',
  label: 'Décision en cours',
  description: 'L\'analyse IA est en cours de traitement.',
  why: 'Les résultats seront disponibles dans quelques secondes.',
  headerBg: 'bg-gray-50',
  iconBg: 'bg-gray-100',
  iconText: 'text-gray-700',
  border: 'border-gray-200',
};

const OVERRIDE_OPTIONS: { value: DecisionValue; label: string }[] = [
  { value: 'AUTO_APPROUVER', label: '✅ Approbation automatique' },
  { value: 'REVISION_MANUELLE', label: '⚠️ Révision manuelle' },
  { value: 'ESCALADER', label: '🚨 Escalader' },
];

export function DecisionPanel({
  decision,
  confidence,
  canOverride = false,
  onOverride,
  className,
}: DecisionPanelProps) {
  const [showWhy, setShowWhy] = useState(false);
  const [overrideValue, setOverrideValue] = useState<DecisionValue>(
    (decision as DecisionValue) || 'REVISION_MANUELLE'
  );
  const [isSaving, setIsSaving] = useState(false);

  const config = DECISION_CONFIG[decision] ?? FALLBACK_CONFIG;
  const confidencePct = Math.round(Math.min(100, Math.max(0, confidence * 100)));

  async function handleOverride() {
    if (!onOverride) return;
    setIsSaving(true);
    try {
      await onOverride(overrideValue);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className={cn('overflow-hidden', config.border, className)}>
      {/* Header */}
      <CardHeader className={cn('pb-3', config.headerBg)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg',
                config.iconBg,
                config.iconText
              )}
            >
              {config.icon}
            </span>
            <div>
              <CardTitle className="text-base">{config.label}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          {/* Confidence pill */}
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted-foreground">Confiance</div>
            <div className="text-lg font-bold">{confidencePct}%</div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={cn('h-full rounded-full transition-all duration-500', {
              'bg-green-500': confidencePct >= 75,
              'bg-yellow-500': confidencePct >= 50 && confidencePct < 75,
              'bg-red-500': confidencePct < 50,
            })}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Expandable "Pourquoi?" */}
        <div>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
          >
            <span>{showWhy ? '▾' : '▸'}</span>
            Pourquoi cette décision ?
          </button>
          {showWhy && (
            <p className="mt-2 rounded-md bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
              {config.why}
            </p>
          )}
        </div>

        {/* Override section */}
        {canOverride && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Remplacer la décision IA
            </p>
            <div className="flex items-center gap-2">
              <select
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value as DecisionValue)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {OVERRIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleOverride}
                disabled={isSaving || overrideValue === decision}
                className="shrink-0 text-xs"
              >
                {isSaving ? 'Sauvegarde…' : 'Appliquer'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
