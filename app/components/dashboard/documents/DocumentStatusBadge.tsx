'use client';

import { cn } from '@/lib/utils';
import { DOCUMENT_STATUS_CONFIG, type DocumentStatus } from '@/app/lib/document-maps';

interface DocumentStatusBadgeProps {
  status:    DocumentStatus;
  className?: string;
}

export function DocumentStatusBadge({ status, className }: DocumentStatusBadgeProps) {
  const cfg = DOCUMENT_STATUS_CONFIG[status];
  if (!cfg) return <span className="text-xs text-gray-400">{status}</span>;

  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        cfg.color,
        className,
      )}
      title={cfg.description}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {cfg.label}
    </span>
  );
}
