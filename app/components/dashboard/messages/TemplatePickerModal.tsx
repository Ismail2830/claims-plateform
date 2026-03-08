'use client';

import { useState, useEffect } from 'react';
import { replaceTemplateVariables } from '@/app/lib/messages-utils';

interface Template {
  id:        string;
  name:      string;
  content:   string;
  category:  string | null;
  isGlobal:  boolean;
}

interface Props {
  onSelect: (content: string) => void;
  onClose:  () => void;
  context?: Record<string, string>;
}

export default function TemplatePickerModal({ onSelect, onClose, context = {} }: Props) {
  const [templates, setTemplates]     = useState<Template[]>([]);
  const [search, setSearch]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [preview, setPreview]         = useState<Template | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch('/api/messages/templates', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { setTemplates(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Modèles de messages</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un modèle..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Template list */}
          <div className="w-1/2 overflow-y-auto border-r border-gray-100">
            {loading && <p className="p-4 text-sm text-gray-400 text-center">Chargement...</p>}
            {!loading && filtered.length === 0 && (
              <p className="p-4 text-sm text-gray-400 text-center">Aucun modèle</p>
            )}
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => setPreview(t)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${preview?.id === t.id ? 'bg-blue-50' : ''}`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                {t.category && <p className="text-xs text-gray-400">{t.category}</p>}
                {t.isGlobal && <span className="text-xs text-blue-500">Global</span>}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {preview ? (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Aperçu</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                  {replaceTemplateVariables(preview.content, context)}
                </p>
                <button
                  onClick={() => {
                    onSelect(replaceTemplateVariables(preview.content, context));
                    onClose();
                  }}
                  className="mt-3 w-full bg-blue-600 text-white text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Utiliser ce modèle
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center mt-8">Sélectionnez un modèle</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
