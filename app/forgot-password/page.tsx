'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Une erreur est survenue.');
        return;
      }

      setSent(true);
    } catch {
      setError('Impossible de contacter le serveur. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la connexion</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ISM Assurance</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {/* Icon + title */}
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié</h2>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Envoi en cours...</span>
                      </div>
                    ) : (
                      'Envoyer le lien de réinitialisation'
                    )}
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Vérifiez votre email</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Si un compte existe pour{' '}
                  <span className="font-medium text-gray-700">{email}</span>, vous recevrez un lien
                  de réinitialisation dans les prochaines minutes.
                </p>
                <p className="text-xs text-gray-400">
                  Le lien expire dans <strong>15 minutes</strong>. Vérifiez aussi vos spams.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Vous vous souvenez de votre mot de passe ?{' '}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Se connecter
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
