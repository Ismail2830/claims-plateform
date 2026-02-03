import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onLogin: (email: string, password: string) => void;
}

export function Login({ onBack, onSignUp, onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin(email, password);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ISM Assurance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            Connexion à votre espace
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base">
            Accédez à vos dossiers de sinistres en toute sécurité
          </p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100 p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Adresse email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm sm:text-base"
                placeholder="votre.email@exemple.com"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none pr-12 text-sm sm:text-base"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Mot de passe oublié ?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Connexion <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-neutral-200"></div>
            <span className="text-xs text-neutral-500 font-medium">OU</span>
            <div className="flex-1 h-px bg-neutral-200"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-neutral-600 mb-4">
              Vous n'avez pas encore de compte ?
            </p>
            <button
              onClick={onSignUp}
              className="w-full bg-neutral-100 text-neutral-900 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-all border border-neutral-200 text-sm sm:text-base"
            >
              Créer un compte
            </button>
          </div>
        </motion.div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors font-medium"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
}