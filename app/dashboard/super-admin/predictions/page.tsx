import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default function PredictionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prédictions IA</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Analyses prédictives et modélisation prospective
          </p>
        </div>
        <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">
          🚧 En cours de développement
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fonctionnalités prévues</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>Prédiction du volume de sinistres sur les 12 prochains mois</li>
            <li>Modélisation du risque de désabonnement client (churn)</li>
            <li>Prévision des besoins en provisionnement</li>
            <li>Identification proactive des dossiers à risque élevé</li>
            <li>Recommandations tarifaires basées sur l'historique</li>
            <li>Alertes prédictives de fraude potentielle</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
