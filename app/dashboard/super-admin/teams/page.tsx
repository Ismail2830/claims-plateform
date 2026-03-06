import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Équipes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestion des équipes et des structures organisationnelles
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
            <li>Création et gestion des équipes métier</li>
            <li>Attribution de rôles et responsabilités</li>
            <li>Suivi des performances par équipe</li>
            <li>Gestion des capacités et de la charge de travail</li>
            <li>Historique des activités par équipe</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
