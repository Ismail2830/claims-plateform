import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestion centralisée de tous les documents de la plateforme
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
            <li>Explorateur de documents centralisé</li>
            <li>Gestion des types et catégories de documents</li>
            <li>Contrôle d'accès par rôle aux documents sensibles</li>
            <li>Recherche full-text dans les documents</li>
            <li>Archivage automatique et politique de rétention</li>
            <li>Audit trail des accès et modifications</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
