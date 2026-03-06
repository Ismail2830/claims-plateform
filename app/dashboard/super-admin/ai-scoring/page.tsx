import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';

export default function AiScoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring IA</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Évaluation et analyse des risques par intelligence artificielle
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
            <li>Modèles de scoring automatique des sinistres</li>
            <li>Détection de fraude basée sur le machine learning</li>
            <li>Évaluation dynamique du risque client</li>
            <li>Tableau de bord des performances des modèles IA</li>
            <li>Historique des prédictions et taux de précision</li>
            <li>Configuration des seuils d'alerte par score</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
