'use client'

import type { ClaimSummary } from '@/app/lib/chatbot/types'

interface Props {
  summary: ClaimSummary
  onConfirm: () => void
  onEdit: () => void
  disabled?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  AUTO: '🚗 Accident automobile',
  HABITATION: '🏠 Dégât habitation',
  SANTE: '🏥 Soins médicaux',
  VIE: '👤 Assurance vie',
}

const DAMAGE_LABELS: Record<string, string> = {
  WATER: '💧 Dégât des eaux',
  FIRE: '🔥 Incendie',
  WEATHER: '🌪️ Intempéries',
  BURGLARY: '🔓 Cambriolage',
  GLASS: '🪟 Bris de glace',
  OTHER: '❓ Autre',
}

const CARE_LABELS: Record<string, string> = {
  HOSPITAL: '🏥 Hospitalisation',
  PHARMACY: '💊 Médicaments',
  DENTAL: '🦷 Dentaire',
  OPTIC: '👓 Optique',
  LAB: '🔬 Analyses',
  CONSULT: '👨‍⚕️ Consultation',
}

function formatDate(raw?: string): string {
  if (!raw) return '—'
  // Try parsing ISO or DD/MM/YYYY
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  }
  return raw
}

export default function ChatSummaryCard({ summary, onConfirm, onEdit, disabled }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: 'Type de sinistre', value: TYPE_LABELS[summary.claimType] ?? summary.claimType },
  ]

  if (summary.damageType) rows.push({ label: 'Type de dégât', value: DAMAGE_LABELS[summary.damageType] ?? summary.damageType })
  if (summary.careType) rows.push({ label: 'Type de soins', value: CARE_LABELS[summary.careType] ?? summary.careType })
  if (summary.beneficiary) rows.push({ label: 'Bénéficiaire', value: summary.beneficiary })
  if (summary.incidentDate) rows.push({ label: 'Date du sinistre', value: formatDate(summary.incidentDate) })
  if (summary.incidentLocation) rows.push({ label: 'Lieu', value: summary.incidentLocation })
  if (summary.estimatedAmount) rows.push({ label: 'Dégâts estimés', value: summary.estimatedAmount })
  if (summary.description) rows.push({ label: 'Description', value: summary.description })
  rows.push({ label: 'Documents joints', value: `${summary.docsCount} fichier${summary.docsCount !== 1 ? 's' : ''}` })

  return (
    <div className="ml-10 mt-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden max-w-sm">
      <div className="bg-blue-600 text-white px-4 py-3">
        <p className="font-semibold text-sm">📋 Récapitulatif de votre déclaration</p>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 px-4 py-2.5">
            <span className="text-xs text-gray-500 font-medium min-w-[110px]">{row.label}</span>
            <span className="text-xs text-gray-800 text-right">{row.value}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors"
        >
          ✅ Confirmer et soumettre
        </button>
        <button
          onClick={onEdit}
          disabled={disabled}
          className="flex-1 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium py-2 rounded-xl transition-colors"
        >
          ✏️ Modifier
        </button>
      </div>
    </div>
  )
}
