'use client';

import { ChurnClientData, getChurnLabel } from '@/app/lib/predictions/prediction-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Mail } from 'lucide-react';

interface ChurnClientRowProps {
  client: ChurnClientData;
  onRetentionEmail: (client: ChurnClientData) => void;
  onViewClient: (clientId: string) => void;
}

export function ChurnClientRow({ client, onRetentionEmail, onViewClient }: ChurnClientRowProps) {
  const { label, bgColor, textColor, dotColor } = getChurnLabel(client.score);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* Client */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
            {client.firstName[0]}{client.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{client.firstName} {client.lastName}</p>
            <p className="text-xs text-gray-500">{client.email}</p>
          </div>
        </div>
      </td>

      {/* Score */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">{client.score}%</span>
            <Badge className={`text-xs ${bgColor} ${textColor} border-0`}>
              {dotColor} {label}
            </Badge>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                client.score >= 70 ? 'bg-red-500' : client.score >= 40 ? 'bg-orange-400' : 'bg-green-500'
              }`}
              style={{ width: `${client.score}%` }}
            />
          </div>
        </div>
      </td>

      {/* Main reason */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700">{client.mainReason}</span>
      </td>

      {/* Active policies */}
      <td className="px-4 py-3 text-center">
        <Badge variant="secondary" className="text-xs">
          {client.activePoliciesCount}
        </Badge>
      </td>

      {/* Last claim */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500">
          {client.lastClaimDate
            ? new Date(client.lastClaimDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Aucun'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => onRetentionEmail(client)}
          >
            <Mail className="w-3 h-3" />
            Offre fidélité
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={() => onViewClient(client.clientId)}
          >
            <Eye className="w-3 h-3" />
            Voir
          </Button>
        </div>
      </td>
    </tr>
  );
}
