import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

export default function WhatsappPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Bot</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Configuration et supervision du chatbot WhatsApp
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
            <li>Configuration des flux de conversation automatisés</li>
            <li>Gestion des modèles de messages WhatsApp</li>
            <li>Tableau de bord des conversations actives</li>
            <li>Statistiques d'engagement et taux de réponse</li>
            <li>Intégration avec l'API Twilio / WhatsApp Business</li>
            <li>Escalade automatique vers un agent humain</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
