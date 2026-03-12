'use client'

import { CheckCircle, Copy, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  claimNumber: string
  estimatedDays: number
  claimId: string
}

const PROGRESS_STEPS = [
  { label: 'Déclaré', icon: '✅' },
  { label: 'En instruction', icon: '🔄' },
  { label: 'Décision', icon: '⬜' },
  { label: 'Paiement', icon: '⬜' },
]

export default function ChatConfirmationCard({ claimNumber, estimatedDays, claimId }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  async function copyNumber() {
    await navigator.clipboard.writeText(claimNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ml-10 mt-2 bg-green-50 border border-green-200 rounded-2xl shadow-sm p-5 max-w-sm space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <h3 className="font-bold text-gray-900 text-base">
          Votre dossier a été créé avec succès!
        </h3>
      </div>

      {/* Claim number */}
      <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-green-100">
        <div>
          <p className="text-xs text-gray-500">Numéro de dossier</p>
          <p className="font-mono font-bold text-blue-600 text-sm">{claimNumber}</p>
        </div>
        <button
          onClick={copyNumber}
          className="text-gray-400 hover:text-blue-600 transition-colors"
          title="Copier"
        >
          {copied ? (
            <span className="text-green-500 text-xs">✅</span>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Estimated time */}
      <p className="text-xs text-gray-600 text-center">
        ⏱️ Délai de traitement estimé:{' '}
        <span className="font-semibold text-gray-900">{estimatedDays} jours ouvrables</span>
      </p>

      {/* Progress steps */}
      <div className="flex items-center justify-between px-2">
        {PROGRESS_STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-base">{step.icon}</span>
            <span className="text-[9px] text-gray-500 text-center leading-tight">{step.label}</span>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className="absolute" style={{ display: 'none' }} />
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push(`/dashboard/client/claims/${claimId}`)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Suivre mon dossier
        </button>
        <button
          onClick={() => router.push('/dashboard/client')}
          className="flex-1 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-medium py-2.5 rounded-xl transition-colors"
        >
          🏠 Tableau de bord
        </button>
      </div>
    </div>
  )
}
