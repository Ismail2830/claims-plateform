import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards Analytics</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Tableaux de bord analytiques et visualisations avancées
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
            <li>Tableaux de bord personnalisables avec widgets glissables</li>
            <li>Graphiques d'évolution des sinistres dans le temps</li>
            <li>Analyse comparative par période et par région</li>
            <li>KPIs clés : taux de traitement, délais moyens, satisfaction</li>
            <li>Export des visualisations en PDF/PNG</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
