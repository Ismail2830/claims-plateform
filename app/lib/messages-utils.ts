export type MessageVisibility = 'ALL' | 'CLIENT_ONLY' | 'INTERNAL_ONLY';
export type UrgencyLevel = 'NORMAL' | 'HIGH' | 'URGENT';

export function formatMessageTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return timeStr;

  if (diffDays < 7) {
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return `${day} ${timeStr}`;
  }

  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' }) + ' ' + timeStr;
}

export function formatConversationDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' });
}

export function formatMessageGroupDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function getVisibilityConfig(v: MessageVisibility) {
  const map = {
    ALL:           { label: 'Client + Équipe',   color: 'text-blue-600',  text: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200' },
    INTERNAL_ONLY: { label: 'Équipe seulement',   color: 'text-gray-600',  text: 'text-gray-600',  bg: 'bg-gray-50',  border: 'border-gray-200' },
    CLIENT_ONLY:   { label: 'Client seulement',   color: 'text-green-600', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  } as const;
  return map[v];
}

export function getUrgencyConfig(level: UrgencyLevel) {
  const map = {
    NORMAL: { level: 'NORMAL' as const, label: 'Normal',  icon: '',   textColor: 'text-gray-500',   color: 'text-gray-500',  bg: 'bg-gray-100',   border: 'border-transparent', dot: 'bg-gray-400' },
    HIGH:   { level: 'HIGH'   as const, label: 'Élevé',   icon: '⚠️', textColor: 'text-orange-600', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300',   dot: 'bg-orange-500' },
    URGENT: { level: 'URGENT' as const, label: 'Urgent',  icon: '🔥', textColor: 'text-red-600',    color: 'text-red-600',   bg: 'bg-red-50',     border: 'border-red-300',      dot: 'bg-red-500' },
  } as const;
  return map[level];
}

export function replaceTemplateVariables(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\[([A-Z_]+)\]/g, (_, key) => context[key] ?? context[key.toLowerCase()] ?? `[${key}]`);
}

export const URGENT_KEYWORDS = [
  'urgent', 'urgence', 'immédiat',
  'plainte', 'porter plainte',
  'avocat', 'tribunal', 'procès', 'justice',
  'arnaque', 'escroquerie', 'fraude',
  'décès', 'hospitalisation urgente',
  'accident grave',
];

export function detectUrgency(content: string): boolean {
  const lower = content.toLowerCase();
  return URGENT_KEYWORDS.some(kw => lower.includes(kw));
}

export function formatAmount(amount: number | string | null | undefined): string {
  const n = parseFloat(String(amount ?? 0));
  if (isNaN(n)) return '—';
  return n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 });
}
