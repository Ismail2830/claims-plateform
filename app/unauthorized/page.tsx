'use client';

import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <ShieldOff className="h-10 w-10 text-red-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Accès non autorisé</h1>
          <p className="text-gray-500">
            Vous n&apos;avez pas les droits nécessaires pour accéder à cette page.
            Contactez votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/auth/admin"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Se connecter
          </Link>
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    </div>
  );
}
