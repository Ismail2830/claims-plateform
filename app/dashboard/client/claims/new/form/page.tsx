'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Classic claim declaration form.
 * Redirects to the existing claim creation page at /dashboard/client/claims.
 * Replace this with the actual form component when available.
 */
export default function ClassicFormPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the existing claim form
    router.replace('/claims/create')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Chargement du formulaire...</p>
      </div>
    </div>
  )
}
