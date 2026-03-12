'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bot, FileText, ArrowLeft } from 'lucide-react'
import ClientLayout from '@/app/components/dashboard/ClientLayout'

const FEATURES_AI = [
  'Guidé étape par étape',
  'Disponible 24h/24, 7j/7',
  'Aide contextuelle incluse',
  '3 minutes en moyenne',
]

const FEATURES_FORM = [
  'Contrôle total',
  'Rapide si vous connaissez le processus',
  'Tous les champs en une vue',
]

export default function NewClaimPage() {
  const router = useRouter()
  const [lastMethod, setLastMethod] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('lastDeclarationMethod')
    setLastMethod(stored)
  }, [])

  function handleSelect(method: 'assistant' | 'form') {
    localStorage.setItem('lastDeclarationMethod', method)
    router.push(`/dashboard/client/claims/new/${method}`)
  }

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Déclarer un sinistre
            </h1>
            <p className="text-gray-500 text-base">
              Choisissez comment vous souhaitez procéder
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card 1 — AI Assistant */}
            <div
              onClick={() => handleSelect('assistant')}
              className="relative bg-blue-50 border-2 border-blue-200 hover:border-blue-500 hover:shadow-xl rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col"
            >
              {/* Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                  ✨ Recommandé
                </span>
              </div>

              <div className="flex flex-col items-center text-center mb-4 mt-2">
                <div className="bg-blue-100 rounded-full p-4 mb-3">
                  <Bot className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Avec l'assistant IA
                </h2>
                <p className="text-sm text-gray-600">
                  Guidé étape par étape. Répondez simplement aux questions,
                  ISM Bot s'occupe du reste.
                </p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {FEATURES_AI.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-bold">✅</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); handleSelect('assistant') }}
              >
                Commencer avec ISM Bot →
              </button>
            </div>

            {/* Card 2 — Classic Form */}
            <div
              onClick={() => handleSelect('form')}
              className="bg-white border-2 border-gray-200 hover:border-gray-400 hover:shadow-xl rounded-2xl p-6 cursor-pointer transition-all duration-200 flex flex-col"
            >
              <div className="flex flex-col items-center text-center mb-4 mt-2">
                <div className="bg-gray-100 rounded-full p-4 mb-3">
                  <FileText className="w-10 h-10 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Formulaire classique
                </h2>
                <p className="text-sm text-gray-600">
                  Remplissez directement le formulaire si vous préférez
                  gérer vous-même.
                </p>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {FEATURES_FORM.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500 font-bold">✅</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
                onClick={(e) => { e.stopPropagation(); handleSelect('form') }}
              >
                Ouvrir le formulaire →
              </button>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Vous pouvez passer d'une option à l'autre à tout moment
          </p>

          {lastMethod && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Vous avez utilisé{' '}
              <span className="font-medium">
                {lastMethod === 'assistant' ? "l'assistant IA" : 'le formulaire'}
              </span>{' '}
              lors de votre dernière déclaration.
            </p>
          )}
        </div>
      </div>
    </ClientLayout>
  )
}
