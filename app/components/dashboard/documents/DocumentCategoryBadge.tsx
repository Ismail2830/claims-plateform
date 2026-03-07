'use client';

import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPE_COLORS, type DocumentType } from '@/app/lib/document-maps';

interface DocumentCategoryBadgeProps {
  fileType:  DocumentType;
  size?:     'sm' | 'md';
  className?: string;
}

export function DocumentCategoryBadge({ fileType, size = 'md', className }: DocumentCategoryBadgeProps) {
  const label = DOCUMENT_TYPE_LABELS[fileType] ?? fileType;
  const color = DOCUMENT_TYPE_COLORS[fileType] ?? 'bg-gray-100 text-gray-600';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        color,
        className,
      )}
    >
      <span className={cn('rounded-full shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', color.split(' ')[1].replace('text-', 'bg-').replace('-800', '-500').replace('-600', '-400').replace('-700', '-500').replace('-900', '-600'))} />
      {label}
    </span>
  );
}
