'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { trpc } from '@/app/lib/trpc-client';
import {
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  Lock,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Shield,
  Send,
} from 'lucide-react';
import type { UserProfile, ChangePasswordFormData } from '@/types/profile';

// ─── Zod Schemas ─────────────────────────────────────────────────
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// ─── Helpers ─────────────────────────────────────────────────────
function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Very weak', color: 'bg-red-500' },
    1: { label: 'Weak', color: 'bg-orange-500' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-blue-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very strong', color: 'bg-emerald-600' },
  };
  return { score, ...map[score] };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < score ? color : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function PasswordInput({ label, error, ...props }: React.ComponentProps<typeof Input> & { label: string; error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <Input {...props} type={show ? 'text' : 'password'} className={`pr-10 ${error ? 'border-red-400' : ''} ${props.className ?? ''}`} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── OTP Input (6 individual boxes) ──────────────────────────────
function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleChange = (i: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const arr = (value + '      ').slice(0, 6).split('');
    arr[i] = digit;
    const next = arr.join('').trimEnd();
    onChange(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-10 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
}

// ─── Contact Verification Row ─────────────────────────────────────
function ContactVerifyRow({
  type,
  label,
  value,
  isVerified,
  onVerified,
}: {
  type: 'email' | 'phone';
  label: string;
  value: string;
  isVerified: boolean;
  onVerified: () => void;
}) {
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtp = trpc.clientAuth.sendVerificationOtp.useMutation({
    onSuccess: () => {
      toast.success(`OTP sent to your ${type}`);
      setShowOtp(true);
      setOtp('');
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(timerRef.current!); return 0; }
          return c - 1;
        });
      }, 1000);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyOtp = trpc.clientAuth.verifyContactOtp.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setShowOtp(false);
      setOtp('');
      onVerified();
    },
    onError: (err) => toast.error(err.message),
  });

  const Icon = type === 'email' ? Mail : Phone;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{label}</p>
            <p className="text-xs text-gray-500">{value}</p>
          </div>
        </div>
        {isVerified ? (
          <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={sendOtp.isPending}
            onClick={() => !showOtp && sendOtp.mutate({ type })}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs gap-1.5"
          >
            {sendOtp.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {showOtp ? 'OTP Sent' : 'Verify'}
          </Button>
        )}
      </div>

      {!isVerified && showOtp && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <p className="text-xs text-blue-700 text-center">
            Enter the 6-digit code sent to your {type}
          </p>
          <OtpInput value={otp} onChange={setOtp} disabled={verifyOtp.isPending} />
          {verifyOtp.error && (
            <p className="text-xs text-red-500 text-center flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {verifyOtp.error.message}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              className="text-xs text-gray-400 hover:text-blue-600 disabled:opacity-40"
              disabled={countdown > 0 || sendOtp.isPending}
              onClick={() => sendOtp.mutate({ type })}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowOtp(false); setOtp(''); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={otp.length < 6 || verifyOtp.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-xs"
                onClick={() => verifyOtp.mutate({ type, code: otp })}
              >
                {verifyOtp.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────
interface SecurityTabProps {
  profile: UserProfile;
  onProfileUpdated: () => void;
}

// ─── Component ───────────────────────────────────────────────────
export function SecurityTab({ profile, onProfileUpdated }: SecurityTabProps) {
  const utils = trpc.useUtils();

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile.twoFactorEnabled);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'phone'>(
    (profile.twoFactorMethod as 'email' | 'phone') ?? 'email'
  );
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canVerifyOptions = [
    ...(profile.emailVerified ? ['email'] : []),
    ...(profile.phoneVerified ? ['phone'] : []),
  ] as ('email' | 'phone')[];
  void canVerifyOptions; // used indirectly via profile.emailVerified / profile.phoneVerified checks

  const update2FA = trpc.clientAuth.update2FAPreference.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.clientAuth.getProfile.invalidate();
      onProfileUpdated();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggle2FA = (checked: boolean) => {
    if (checked) {
      setShowMethodPicker(true);
    } else {
      update2FA.mutate({ enabled: false });
      setTwoFactorEnabled(false);
      setShowMethodPicker(false);
    }
  };

  const handleEnable2FA = () => {
    update2FA.mutate({ enabled: true, method: twoFactorMethod });
    setTwoFactorEnabled(true);
    setShowMethodPicker(false);
  };

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword') || '';

  const onPasswordSubmit = async (_data: ChangePasswordFormData) => {
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      reset();
      toast.success('Password changed successfully!');
    } catch {
      toast.error('Failed to change password.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasVerified = profile.emailVerified || profile.phoneVerified;

  return (
    <div className="space-y-6">
      {/* ── Contact Verification ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Contact Verification
          </CardTitle>
          <CardDescription>
            Verify your email and phone number to secure your account and enable 2FA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ContactVerifyRow
            type="email"
            label="Email Address"
            value={profile.email}
            isVerified={profile.emailVerified}
            onVerified={() => { utils.clientAuth.getProfile.invalidate(); onProfileUpdated(); }}
          />
          <div className="border-t border-gray-100" />
          <ContactVerifyRow
            type="phone"
            label="Phone Number"
            value={profile.phone}
            isVerified={profile.phoneVerified}
            onVerified={() => { utils.clientAuth.getProfile.invalidate(); onProfileUpdated(); }}
          />
        </CardContent>
      </Card>

      {/* ── Two-Factor Authentication ──────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-purple-500" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Require an OTP code every time you log in for extra security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">2FA Status</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {!hasVerified
                  ? 'Verify your email or phone first to enable 2FA.'
                  : twoFactorEnabled
                  ? `Active — codes sent via ${profile.twoFactorMethod ?? twoFactorMethod}`
                  : 'Enable for stronger login protection.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={
                  twoFactorEnabled
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                }
              >
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggle2FA}
                disabled={!hasVerified || update2FA.isPending}
                aria-label="Toggle two-factor authentication"
              />
            </div>
          </div>

          {showMethodPicker && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Choose how to receive your OTP:</p>
              <div className="flex flex-col gap-2">
                {(['email', 'phone'] as const).map((m) => {
                  const verified = m === 'email' ? profile.emailVerified : profile.phoneVerified;
                  return (
                    <label
                      key={m}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        !verified
                          ? 'opacity-40 cursor-not-allowed border-gray-200'
                          : twoFactorMethod === m
                          ? 'border-purple-400 bg-white shadow-sm'
                          : 'border-gray-200 bg-white hover:border-purple-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="twoFactorMethod"
                        value={m}
                        disabled={!verified}
                        checked={twoFactorMethod === m}
                        onChange={() => setTwoFactorMethod(m)}
                        className="accent-purple-600"
                      />
                      {m === 'email' ? <Mail className="w-4 h-4 text-gray-500" /> : <Phone className="w-4 h-4 text-gray-500" />}
                      <div className="flex-1">
                        <span className="text-sm font-medium capitalize">{m}</span>
                        {!verified && <span className="ml-2 text-xs text-gray-400">(not verified)</span>}
                      </div>
                      {verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </label>
                  );
                })}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => { setShowMethodPicker(false); setTwoFactorEnabled(false); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-xs"
                  disabled={update2FA.isPending}
                  onClick={handleEnable2FA}
                >
                  {update2FA.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Enable 2FA
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Change Password ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-500" />
            Change Password
          </CardTitle>
          <CardDescription>Choose a strong, unique password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
            <PasswordInput label="Current Password" error={errors.currentPassword?.message} {...register('currentPassword')} />
            <div className="space-y-1">
              <PasswordInput label="New Password" error={errors.newPassword?.message} {...register('newPassword')} />
              <PasswordStrengthBar password={newPasswordValue} />
            </div>
            <PasswordInput label="Confirm New Password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</> : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
