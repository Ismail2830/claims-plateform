import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileBarChart className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Génération et gestion des rapports périodiques
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
            <li>Rapports mensuels et annuels automatisés</li>
            <li>Rapport de sinistralité par catégorie de risque</li>
            <li>Rapport financier des primes encaissées vs indemnisations</li>
            <li>Rapport de conformité réglementaire (ACAPS)</li>
            <li>Planification de l'envoi automatique par email</li>
            <li>Historique des rapports générés</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
