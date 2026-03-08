'use client';

import { Download } from 'lucide-react';

interface Props {
  targetId: string;
  filename?: string;
}

export function ExportButton({ targetId, filename = 'analytics' }: Props) {
  const handleExport = () => {
    const el = document.getElementById(targetId);
    if (!el) return;

    // Add a temporary print-only wrapper to scope what gets printed
    const style = document.createElement('style');
    style.id = '__analytics-print-style';
    style.textContent = `
      @media print {
        body > *:not(#__analytics-print-wrapper) { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = '__analytics-print-wrapper';
    const clone = el.cloneNode(true) as HTMLElement;
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    window.print();

    document.body.removeChild(wrapper);
    document.head.removeChild(style);
  };

  void filename; // kept in signature for API compatibility

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
    >
      <Download className="w-3.5 h-3.5" />
      Exporter PDF
    </button>
  );
}
