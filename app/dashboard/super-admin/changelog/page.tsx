import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollText } from 'lucide-react';

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ScrollText className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Changelog</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Historique des versions et des mises à jour de la plateforme
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
            <li>Historique des versions avec notes de release détaillées</li>
            <li>Catégorisation : nouvelles fonctionnalités, corrections, améliorations</li>
            <li>Notifications automatiques des mises à jour critiques</li>
            <li>Comparaison des changements entre versions</li>
            <li>Calendrier des prochaines mises à jour prévues</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
