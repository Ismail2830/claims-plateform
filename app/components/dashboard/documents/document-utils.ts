import { File, FileText, ImageIcon, FileSpreadsheet, type LucideIcon } from 'lucide-react';

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} o`;
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1_048_576).toFixed(1)} Mo`;
}

export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith('image/'))            return ImageIcon;
  if (mimeType === 'application/pdf')           return FileText;
  if (mimeType.startsWith('application/vnd.')) return FileSpreadsheet;
  return File;
}

export function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith('image/'))            return 'text-purple-500';
  if (mimeType === 'application/pdf')           return 'text-red-500';
  if (mimeType.startsWith('application/vnd.')) return 'text-green-500';
  return 'text-gray-400';
}

export function fmtRelativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60)              return 'à l\'instant';
  const mins = Math.floor(secs  / 60);
  if (mins < 60)              return `il y a ${mins} min`;
  const hrs  = Math.floor(mins  / 60);
  if (hrs  < 24)              return `il y a ${hrs} h`;
  const days = Math.floor(hrs   / 24);
  if (days < 30)              return `il y a ${days} j`;
  const months = Math.floor(days / 30);
  if (months < 12)            return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}

export function fmtDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
