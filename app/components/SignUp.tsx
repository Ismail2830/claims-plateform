import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Eye, EyeOff, ArrowRight, User, Mail, Lock } from 'lucide-react';

interface SignUpProps {
  onBack: () => void;
  onLogin: () => void;
  onSignUp: (userData: { fullName: string; email: string; password: string }) => void;
}

export function SignUp({ onBack, onLogin, onSignUp }: SignUpProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    // Simulate API call
    setTimeout(() => {
      onSignUp({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ISM Assurance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2">
            Créer votre compte
          </h1>
          <p className="text-neutral-600 text-sm sm:text-base">
            Rejoignez des milliers d'assurés satisfaits
          </p>
        </div>

        {/* Sign Up Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl shadow-neutral-200/50 border border-neutral-100 p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-neutral-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm sm:text-base"
                  placeholder="Jean Dupont"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="w-full px-4 py-3 pl-10 rounded-xl border border-neutral-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm sm:text-base"
                  placeholder="votre.email@exemple.com"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
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
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className={`w-full px-4 py-3 pl-10 pr-12 rounded-xl border transition-all outline-none text-sm sm:text-base ${
                    errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-neutral-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  className={`w-full px-4 py-3 pl-10 pr-12 rounded-xl border transition-all outline-none text-sm sm:text-base ${
                    errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-neutral-200 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="terms"
                required
                className="mt-1 w-4 h-4 text-blue-600 border-neutral-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="terms" className="text-xs sm:text-sm text-neutral-600">
                J'accepte les{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  conditions d'utilisation
                </a>{' '}
                et la{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                  politique de confidentialité
                </a>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base mt-6"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Créer mon compte <ArrowRight className="w-4 h-4" />
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

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-neutral-600 mb-4">
              Vous avez déjà un compte ?
            </p>
            <button
              onClick={onLogin}
              className="w-full bg-neutral-100 text-neutral-900 py-3 rounded-xl font-semibold hover:bg-neutral-200 transition-all border border-neutral-200 text-sm sm:text-base"
            >
              Se connecter
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