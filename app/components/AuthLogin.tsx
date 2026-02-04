import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useClientAuth } from '@/app/hooks/useAuth';

interface AuthLoginProps {
  onBack: () => void;
  onSignUp: () => void;
  onLoginSuccess: () => void;
  userType: 'client' | 'staff';
}

export function AuthLogin({ onBack, onSignUp, onLoginSuccess, userType }: AuthLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const clientAuth = useClientAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userType === 'client') {
      clientAuth.login(
        { email, password },
        {
          onSuccess: () => {
            onLoginSuccess();
          },
        }
      );
    }
    // For staff auth, you would use useStaffAuth hook similarly
  };

  const isLoading = clientAuth.isLoading;
  const errorMessage = clientAuth.loginError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
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
            {userType === 'client' ? 'Connexion Client' : 'Connexion Staff'}
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base">
            {userType === 'client' 
              ? 'Accédez à vos dossiers de sinistres en toute sécurité'
              : 'Accès réservé au personnel autorisé'
            }
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
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errorMessage}
              </div>
            )}

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
                disabled={isLoading}
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
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  disabled={isLoading}
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

          {/* Sign Up Link - Only for clients */}
          {userType === 'client' && (
            <>
              <div className="my-6 flex items-center gap-4">
                <div className="flex-1 h-px bg-neutral-200"></div>
                <span className="text-xs text-neutral-500 font-medium">OU</span>
                <div className="flex-1 h-px bg-neutral-200"></div>
              </div>

              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-4">
                  Vous n'avez pas encore de compte ?
                </p>
                <button
                  onClick={onSignUp}
                  className="w-full bg-neutral-100 text-neutral-900 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-all border border-neutral-200 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  Créer un compte
                </button>
              </div>
            </>
          )}
        </motion.div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-700 transition-colors font-medium"
            disabled={isLoading}
          >
            ← Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );
}