'use client';

interface Props {
  value:    string;
  onChange: (v: string) => void;
}

const OPTIONS = [
  { value: 'ALL',           label: 'Tous',          desc: 'Visible par tous les participants',          icon: '👁️',  bg: 'bg-gray-100',   text: 'text-gray-700' },
  { value: 'CLIENT_ONLY',   label: 'Client',         desc: 'Visible uniquement par le client',           icon: '👤', bg: 'bg-green-100',  text: 'text-green-700' },
  { value: 'INTERNAL_ONLY', label: 'Interne',        desc: 'Visible uniquement par l\'équipe interne',   icon: '🔒', bg: 'bg-orange-100', text: 'text-orange-700' },
] as const;

export default function VisibilitySelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.desc}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            value === opt.value
              ? `${opt.bg} ${opt.text} border-current font-semibold`
              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}
