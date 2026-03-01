'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// ── Password strength indicator ──────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: '8 caractères min.', ok: password.length >= 8 },
    { label: 'Majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Chiffre', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const labels = ['Faible', 'Moyen', 'Bon', 'Fort'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? colors[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-xs flex items-center gap-1 ${c.ok ? 'text-green-600' : 'text-gray-400'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-green-500' : 'bg-gray-300'}`} />
              {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-xs font-medium ${colors[score].replace('bg-', 'text-')}`}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Inner component (uses useSearchParams) ───────────────────────────────
function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // No token in URL
  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
        <p className="text-gray-500 text-sm mb-5">
          Ce lien de réinitialisation est invalide ou déjà utilisé.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Faire une nouvelle demande
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue.');
        return;
      }

      setSuccess(true);
      // Auto-redirect after 3s
      setTimeout(() => router.push('/auth/login?reset=success'), 3000);
    } catch {
      setError('Impossible de contacter le serveur. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Mot de passe mis à jour !</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-5">
          Votre mot de passe a été réinitialisé avec succès.
          <br />
          Vous allez être redirigé vers la page de connexion…
        </p>
        <Link
          href="/auth/login"
          className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Se connecter maintenant
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      {/* Icon + title */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
        <p className="text-gray-500 text-sm">Choisissez un mot de passe fort pour sécuriser votre compte.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nouveau mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        {/* Confirm password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {confirm && password !== confirm && (
            <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>
          )}
          {confirm && password === confirm && confirm.length >= 8 && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Les mots de passe correspondent.
            </p>
          )}
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
          disabled={loading || password !== confirm || password.length < 8}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Mise à jour...</span>
            </div>
          ) : (
            'Réinitialiser le mot de passe'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
}

// ── Page (wraps form in Suspense for useSearchParams) ────────────────────
export default function ResetPasswordPage() {
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

        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">ISM Assurance</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <Suspense fallback={<div className="text-center text-gray-500 py-8">Chargement…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
