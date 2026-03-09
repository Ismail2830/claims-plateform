'use client';

import { useState } from 'react';
import { TariffRecommendation, formatAdjustment } from '@/app/lib/predictions/prediction-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle, Pencil, XCircle } from 'lucide-react';

interface TariffRecommendationRowProps {
  recommendation: TariffRecommendation;
  onApply: (policyId: string, prime: number) => Promise<void>;
  onIgnore: (policyId: string) => void;
}

const policyTypeLabels: Record<string, string> = {
  AUTO: 'Auto',
  HOME: 'Habitation',
  HEALTH: 'Santé',
  LIFE: 'Vie',
  ACCIDENT: 'Accidents',
  PROFESSIONAL: 'Pro',
};

export function TariffRecommendationRow({ recommendation: rec, onApply, onIgnore }: TariffRecommendationRowProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [applying, setApplying] = useState(false);

  const adj = formatAdjustment(rec.adjustment);

  async function handleConfirm() {
    setApplying(true);
    try {
      await onApply(rec.policyId, rec.suggestedPrime);
      setShowConfirm(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <tr className="border-b hover:bg-gray-50 transition-colors">
        {/* Client */}
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">{rec.clientName}</p>
            <p className="text-xs text-gray-500">{policyTypeLabels[rec.policyType] ?? rec.policyType}</p>
          </div>
        </td>

        {/* Policy number */}
        <td className="px-4 py-3">
          <span className="font-mono text-xs text-gray-700">{rec.policyNumber}</span>
        </td>

        {/* Expires in */}
        <td className="px-4 py-3">
          <span className={`text-sm font-medium ${rec.daysToRenewal <= 14 ? 'text-red-600' : rec.daysToRenewal <= 30 ? 'text-orange-600' : 'text-gray-700'}`}>
            {rec.daysToRenewal}j
          </span>
        </td>

        {/* Current prime */}
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700">{new Intl.NumberFormat('fr-FR').format(rec.currentPrime)} MAD</span>
        </td>

        {/* Recommendation */}
        <td className="px-4 py-3">
          <div className="group relative inline-block">
            <Badge className={`text-xs border ${adj.bgColor} ${adj.color} border-current`}>
              {adj.icon} {adj.text}
            </Badge>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-0 mb-1 w-48 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {rec.reason}
            </div>
          </div>
        </td>

        {/* New prime */}
        <td className="px-4 py-3">
          <span className={`text-sm font-semibold ${rec.adjustment > 0 ? 'text-red-600' : rec.adjustment < 0 ? 'text-green-600' : 'text-gray-700'}`}>
            {new Intl.NumberFormat('fr-FR').format(rec.suggestedPrime)} MAD
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => setShowConfirm(true)}>
              <CheckCircle className="w-3 h-3" />
              Appliquer
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400" onClick={() => onIgnore(rec.policyId)}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr>

      {/* Confirmation dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la modification de prime</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              Confirmer la modification de prime pour <strong>{rec.clientName}</strong> ?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Prime actuelle:</span>
                <span className="font-medium">{new Intl.NumberFormat('fr-FR').format(rec.currentPrime)} MAD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Nouvelle prime:</span>
                <span className={`font-bold ${rec.adjustment > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {new Intl.NumberFormat('fr-FR').format(rec.suggestedPrime)} MAD
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Raison:</span>
                <span className="text-gray-700 text-right max-w-50">{rec.reason}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={applying}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleConfirm} disabled={applying}>
              {applying ? 'Application...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
