import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <HelpCircle className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aide & Support</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Documentation, tutoriels et assistance technique
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
            <li>Base de connaissances et documentation intégrée</li>
            <li>Tutoriels vidéo et guides pas à pas</li>
            <li>Système de tickets de support interne</li>
            <li>FAQ dynamique par rôle utilisateur</li>
            <li>Contact direct avec l'équipe technique ISM</li>
            <li>Statut des services et historique des incidents</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
