'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle, Smartphone, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';

// â”€â”€â”€ 6-box OTP input (self-contained) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OtpBoxes({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const arr = (value + '      ').slice(0, 6).split('');
    arr[i] = digit;
    onChange(arr.join('').trimEnd());
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 transition-colors"
        />
      ))}
    </div>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function UnifiedLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA state
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [pendingToken, setPendingToken] = useState('');
  const [twoFAMethod, setTwoFAMethod] = useState<'email' | 'phone'>('email');
  const [maskedContact, setMaskedContact] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useSimpleAuth();
  const wasRegistered = searchParams.get('registered') === 'true';
  const wasReset = searchParams.get('reset') === 'success';
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Clear timer on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = () => {
    setResendCountdown(60);
    timerRef.current = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // â”€â”€ Step 1: email + password submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await auth.login(formData.email, formData.password, rememberMe);

      if (res.requires2FA) {
        setPendingToken(res.pendingToken);
        setTwoFAMethod(res.method);
        setMaskedContact(res.maskedContact);
        setOtp('');
        startResendTimer();
        setStep('2fa');
      } else {
        router.replace('/dashboard/client');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // â”€â”€ Step 2: verify OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      await auth.verify2FA(pendingToken, otp);
      router.replace('/dashboard/client');
    } catch (error: any) {
      setErrorMessage(error.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // â”€â”€ Resend OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setErrorMessage('');
    setOtp('');

    try {
      const res = await auth.login(formData.email, formData.password, rememberMe);
      if (res.requires2FA) {
        setPendingToken(res.pendingToken);
        startResendTimer();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to resend OTP');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const MethodIcon = twoFAMethod === 'email' ? Mail : Phone;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Back Button */}
        {step === 'credentials' ? (
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        ) : (
          <button
            onClick={() => { setStep('credentials'); setErrorMessage(''); }}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">ISM Assurance</h1>
          {step === 'credentials' ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to manage your claims and policies</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Two-Factor Verification</h2>
              <p className="text-gray-600 text-sm">
                A 6-digit code was sent to your{' '}
                <span className="font-medium text-gray-800">{twoFAMethod}</span>
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <AnimatePresence mode="wait">
            {/* â”€â”€ Step 1: Credentials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === 'credentials' && (
              <motion.div key="credentials" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                {wasRegistered && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        <strong>Registration successful!</strong> You can now sign in with your credentials.
                      </p>
                    </div>
                  </motion.div>
                )}

                {wasReset && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        <strong>Mot de passe mis à jour !</strong> Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                      </p>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="email" name="email" type="email" autoComplete="email" required
                        value={formData.email} onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required
                        value={formData.password} onChange={handleChange}
                        className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter your password"
                      />
                      <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600">{errorMessage}</p>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input id="remember-me" name="remember-me" type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">Remember me</label>
                    </div>
                    <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">Mot de passe oublié ?</Link>
                  </div>

                  <motion.button
                    type="submit" disabled={isLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading
                      ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Signing in...</span></div>
                      : 'Sign In'}
                  </motion.button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">Register here</Link>
                  </p>
                </div>
              </motion.div>
            )}

            {/* â”€â”€ Step 2: 2FA OTP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {step === '2fa' && (
              <motion.div key="2fa" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {/* Info banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <MethodIcon className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800">
                    Code sent to <span className="font-semibold">{maskedContact}</span>. Check your {twoFAMethod}.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <OtpBoxes value={otp} onChange={setOtp} disabled={isLoading} />

                  {errorMessage && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-600 text-center">{errorMessage}</p>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit" disabled={isLoading || otp.length < 6} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading
                      ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Verifying...</span></div>
                      : 'Verify Code'}
                  </motion.button>
                </form>

                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-500">
                    Didn't receive the code?{' '}
                    <button
                      disabled={resendCountdown > 0}
                      onClick={handleResend}
                      className="font-medium text-blue-600 hover:text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend code'}
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
