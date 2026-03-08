// ─── Types ────────────────────────────────────────────────────────────────────
// Defined inline to avoid @prisma/client regeneration timing issues

export type ReportType =
  | 'MONTHLY_ACTIVITY' | 'SINISTRALITE' | 'FINANCIAL'
  | 'ACAPS_COMPLIANCE' | 'MANAGER_PERFORMANCE' | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:   "Rapport mensuel d'activité",
  SINISTRALITE:       'Rapport de sinistralité',
  FINANCIAL:          'Rapport financier',
  ACAPS_COMPLIANCE:   'Rapport ACAPS',
  MANAGER_PERFORMANCE:'Rapport gestionnaires',
  CUSTOM:             'Rapport personnalisé',
};

export const REPORT_TYPE_DESCRIPTIONS: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:   "Vue d'ensemble des déclarations, traitements et performances du mois",
  SINISTRALITE:       'Analyse détaillée des sinistres par type, montant et région',
  FINANCIAL:          'Récapitulatif financier : indemnisations, provisions et ratios',
  ACAPS_COMPLIANCE:   'Rapport réglementaire conformément aux exigences ACAPS',
  MANAGER_PERFORMANCE:'Indicateurs de performance par gestionnaire et équipe',
  CUSTOM:             'Rapport sur mesure avec les sections de votre choix',
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:   'bg-blue-100 text-blue-800 border-blue-200',
  SINISTRALITE:       'bg-orange-100 text-orange-800 border-orange-200',
  FINANCIAL:          'bg-purple-100 text-purple-800 border-purple-200',
  ACAPS_COMPLIANCE:   'bg-red-100 text-red-800 border-red-200',
  MANAGER_PERFORMANCE:'bg-teal-100 text-teal-800 border-teal-200',
  CUSTOM:             'bg-gray-100 text-gray-800 border-gray-200',
};

export const REPORT_TYPE_ICONS: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:   '📊',
  SINISTRALITE:       '⚠️',
  FINANCIAL:          '💰',
  ACAPS_COMPLIANCE:   '🛡️',
  MANAGER_PERFORMANCE:'👥',
  CUSTOM:             '⚙️',
};

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  PDF:   'PDF',
  EXCEL: 'Excel (.xlsx)',
  CSV:   'CSV',
};

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  DAILY:     'Quotidien',
  WEEKLY:    'Hebdomadaire',
  MONTHLY:   'Mensuel',
  QUARTERLY: 'Trimestriel',
  ANNUAL:    'Annuel',
};

export const ALL_SECTIONS = [
  { id: 'summary',      label: 'Résumé exécutif' },
  { id: 'claims',       label: 'Déclarations' },
  { id: 'managers',     label: 'Performance gestionnaires' },
  { id: 'ai',           label: 'Analyse IA' },
  { id: 'documents',    label: 'Documents' },
  { id: 'financial',    label: 'Données financières' },
  { id: 'compliance',   label: 'Conformité réglementaire' },
  { id: 'trends',       label: 'Tendances' },
];

export function getCronExpression(
  frequency: ScheduleFrequency,
  hour: number,
  weekDay = 1,
): string {
  switch (frequency) {
    case 'DAILY':     return `0 ${hour} * * *`;
    case 'WEEKLY':    return `0 ${hour} * * ${weekDay}`;
    case 'MONTHLY':   return `0 ${hour} 1 * *`;
    case 'QUARTERLY': return `0 ${hour} 1 */3 *`;
    case 'ANNUAL':    return `0 ${hour} 1 1 *`;
    default:          return `0 ${hour} * * *`;
  }
}

export function getNextRunDate(frequency: ScheduleFrequency, hour = 7): Date {
  const next = new Date();
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1, 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3, 1);
      break;
    case 'ANNUAL':
      next.setFullYear(next.getFullYear() + 1, 0, 1);
      break;
  }
  next.setHours(hour, 0, 0, 0);
  return next;
}

export function formatPeriod(dateFrom: Date, dateTo: Date): string {
  const from = new Date(dateFrom);
  const to   = new Date(dateTo);
  const sameYear = from.getFullYear() === to.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
  if (
    from.getDate() === 1 &&
    to.getDate() === new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()
  ) {
    if (from.getMonth() === to.getMonth() && sameYear) {
      return from.toLocaleDateString('fr-FR', opts);
    }
  }
  return `${from.toLocaleDateString('fr-FR')} – ${to.toLocaleDateString('fr-FR')}`;
}

export function getDefaultPeriod(type: ReportType): { dateFrom: Date; dateTo: Date } {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  const dateFrom = new Date(year, month - 1, 1);
  const dateTo   = new Date(year, month, 0);
  return { dateFrom, dateTo };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
