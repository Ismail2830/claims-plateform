'use client';

interface SignalBadgeProps {
  signal: string;
}

const signalStyles: Record<string, string> = {
  'Aucun document': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Montant 3x': 'bg-red-100 text-red-800 border-red-200',
  'weekend': 'bg-purple-100 text-purple-800 border-purple-200',
  'historique': 'bg-orange-100 text-orange-800 border-orange-200',
  '90 jours': 'bg-red-100 text-red-800 border-red-200',
};

function getSignalStyle(signal: string): string {
  for (const [key, style] of Object.entries(signalStyles)) {
    if (signal.toLowerCase().includes(key.toLowerCase())) return style;
  }
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function getSignalEmoji(signal: string): string {
  if (signal.includes('document')) return '📄';
  if (signal.includes('Montant')) return '💰';
  if (signal.includes('weekend')) return '📅';
  if (signal.includes('historique')) return '⚠️';
  if (signal.includes('90 jours')) return '🔄';
  return '🔔';
}

export function SignalBadge({ signal }: SignalBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${getSignalStyle(signal)}`}
    >
      <span>{getSignalEmoji(signal)}</span>
      {signal}
    </span>
  );
}
