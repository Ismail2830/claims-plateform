/**
 * Shared utility functions for all analytics API routes and components.
 */

export function formatAmount(value: number): string {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)} M MAD`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(0)} K MAD`;
  return `${value.toFixed(0)} MAD`;
}

export function formatTrend(
  current: number,
  previous: number,
  goodWhenPositive = true,
): { text: string; color: string; arrow: string } {
  if (previous === 0) {
    return { text: 'N/A', color: 'text-gray-500', arrow: '' };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const isPositive = pct >= 0;
  const isGood = goodWhenPositive ? isPositive : !isPositive;
  return {
    text: `${isPositive ? '+' : ''}${pct}%`,
    color: isGood ? 'text-emerald-600' : 'text-red-500',
    arrow: isPositive ? '↑' : '↓',
  };
}

export function getPeriodDates(period: string): { dateFrom: Date; dateTo: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  const dateTo = new Date(now);
  const dateFrom = new Date(now);

  switch (period) {
    case 'week':
      dateFrom.setDate(now.getDate() - 7);
      break;
    case 'quarter':
      dateFrom.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      dateFrom.setFullYear(now.getFullYear() - 1);
      break;
    case 'month':
    default:
      dateFrom.setMonth(now.getMonth() - 1);
      break;
  }

  const span = dateTo.getTime() - dateFrom.getTime();
  const prevTo = new Date(dateFrom.getTime());
  const prevFrom = new Date(prevTo.getTime() - span);

  return { dateFrom, dateTo, prevFrom, prevTo };
}

export function getManagerInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
