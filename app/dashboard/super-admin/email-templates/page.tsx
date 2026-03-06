import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail } from 'lucide-react';

export default function EmailTemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modèles emails</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Gestion des templates d'emails transactionnels et marketing
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
            <li>Éditeur visuel de templates HTML/texte</li>
            <li>Bibliothèque de modèles prédéfinis par catégorie</li>
            <li>Variables dynamiques et personnalisation</li>
            <li>Prévisualisation multi-client (desktop, mobile)</li>
            <li>Gestion des versions et historique des modifications</li>
            <li>Tests d'envoi et métriques d'ouverture</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
