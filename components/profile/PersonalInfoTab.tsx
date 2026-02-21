'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  CreditCard,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { trpc } from '@/app/lib/trpc-client';
import type { UserProfile, PersonalInfoFormData } from '@/types/profile';

// ─── Zod Schema ──────────────────────────────────────────────────
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  cin: z.string().min(4, 'National ID must be at least 4 characters'),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().optional(),
});

// ─── Props ───────────────────────────────────────────────────────
interface PersonalInfoTabProps {
  profile: UserProfile;
}

// ─── Helpers ─────────────────────────────────────────────────────
function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge className="ml-2 bg-green-100 text-green-700 border-green-200 text-xs">
      <CheckCircle className="w-3 h-3 mr-1" />
      Verified
    </Badge>
  ) : (
    <Badge className="ml-2 bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">
      <AlertCircle className="w-3 h-3 mr-1" />
      Unverified
    </Badge>
  );
}

// ─── Read-only field display ─────────────────────────────────────
function ReadField({
  label,
  value,
  icon,
  badge,
  masked,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  masked?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = masked ? (revealed ? value : '•'.repeat(Math.min(value.length, 10))) : value || '—';
  return (
    <div className="space-y-1">
      <label className="flex items-center text-xs font-medium text-gray-400 uppercase tracking-wider">
        <span className="mr-2">{icon}</span>
        {label}
        {badge}
      </label>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-800">{display}</p>
        {masked && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-gray-400 hover:text-gray-600"
            aria-label={revealed ? 'Hide' : 'Reveal'}
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Editable field ───────────────────────────────────────────────
function EditField({
  label,
  error,
  icon,
  badge,
  children,
}: {
  label: string;
  error?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center text-sm font-medium text-gray-700">
        <span className="mr-2 text-gray-400">{icon}</span>
        {label}
        {badge}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────
export function PersonalInfoTab({ profile: initialProfile }: PersonalInfoTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [cinVisible, setCinVisible] = useState(false);
  const [savedProfile, setSavedProfile] = useState<UserProfile>(initialProfile);

  // Keep savedProfile in sync when parent re-fetches from DB
  useEffect(() => {
    setSavedProfile(initialProfile);
  }, [initialProfile]);

  const utils = trpc.useUtils();

  const updateProfile = trpc.clientAuth.updateProfile.useMutation({
    onSuccess: (result) => {
      const d = result.data;
      // Merge returned DB fields back into local profile state
      setSavedProfile((prev) => ({
        ...prev,
        firstName:   d.firstName,
        lastName:    d.lastName,
        email:       d.email,
        phone:       d.phone,
        cin:         d.cin,
        dateOfBirth: d.dateOfBirth instanceof Date ? d.dateOfBirth.toISOString() : String(d.dateOfBirth),
        address: {
          ...prev.address,
          street:     d.address,   // address column → street in UI
          city:       d.city,
          province:   d.province,
          postalCode: d.postalCode ?? undefined,
        },
      }));
      // Invalidate the cached profile so a page refresh always shows fresh DB data
      utils.clientAuth.getProfile.invalidate();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setCinVisible(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save changes. Please try again.');
    },
  });

  const isSaving = updateProfile.isPending;

  const buildDefaults = (p: UserProfile) => ({
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    dateOfBirth: p.dateOfBirth.split('T')[0],
    cin: p.cin,
    street: p.address.street,
    city: p.address.city,
    province: p.address.province,
    postalCode: p.address.postalCode ?? '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: buildDefaults(savedProfile),
  });

  const handleEdit = () => {
    reset(buildDefaults(savedProfile));
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset(buildDefaults(savedProfile));
    setIsEditing(false);
    setCinVisible(false);
  };

  const onSubmit = (data: PersonalInfoFormData) => {
    updateProfile.mutate({
      firstName:   data.firstName,
      lastName:    data.lastName,
      email:       data.email,
      phone:       data.phone,
      dateOfBirth: data.dateOfBirth,
      cin:         data.cin,
      street:      data.street,    // mapped to address column in DB
      city:        data.city,
      province:    data.province,
      postalCode:  data.postalCode || undefined,
    });
  };

  // ── Read-only view ───────────────────────────────────────────────
  if (!isEditing) {
    const p = savedProfile;
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900">Personal Information</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleEdit}
            className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Name */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Name</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadField label="First Name" value={p.firstName} icon={<User className="w-4 h-4" />} />
              <ReadField label="Last Name" value={p.lastName} icon={<User className="w-4 h-4" />} />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadField
                label="Email"
                value={p.email}
                icon={<Mail className="w-4 h-4" />}
                badge={<VerifiedBadge verified={p.emailVerified} />}
              />
              <ReadField
                label="Phone Number"
                value={p.phone}
                icon={<Phone className="w-4 h-4" />}
                badge={<VerifiedBadge verified={p.phoneVerified} />}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Identity */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identity</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ReadField
                label="Date of Birth"
                value={new Date(p.dateOfBirth).toLocaleDateString()}
                icon={<Calendar className="w-4 h-4" />}
              />
              <ReadField
                label="National ID (CIN)"
                value={p.cin}
                icon={<CreditCard className="w-4 h-4" />}
                masked
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Address */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Address</p>
            <div className="space-y-4">
              <ReadField label="Street" value={p.address.street} icon={<MapPin className="w-4 h-4" />} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ReadField label="City" value={p.address.city} icon={<MapPin className="w-4 h-4" />} />
                <ReadField label="Province / State" value={p.address.province} icon={<MapPin className="w-4 h-4" />} />
                <ReadField label="Postal Code" value={p.address.postalCode ?? '—'} icon={<MapPin className="w-4 h-4" />} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Edit view ────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Name</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditField label="First Name" error={errors.firstName?.message} icon={<User className="w-4 h-4" />}>
            <Input {...register('firstName')} placeholder="First name" className={errors.firstName ? 'border-red-400' : ''} />
          </EditField>
          <EditField label="Last Name" error={errors.lastName?.message} icon={<User className="w-4 h-4" />}>
            <Input {...register('lastName')} placeholder="Last name" className={errors.lastName ? 'border-red-400' : ''} />
          </EditField>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditField
            label="Email"
            error={errors.email?.message}
            icon={<Mail className="w-4 h-4" />}
            badge={<VerifiedBadge verified={savedProfile.emailVerified} />}
          >
            <Input {...register('email')} type="email" placeholder="Email address" className={errors.email ? 'border-red-400' : ''} />
          </EditField>
          <EditField
            label="Phone Number"
            error={errors.phone?.message}
            icon={<Phone className="w-4 h-4" />}
            badge={<VerifiedBadge verified={savedProfile.phoneVerified} />}
          >
            <Input {...register('phone')} type="tel" placeholder="+1 234 567 8900" className={errors.phone ? 'border-red-400' : ''} />
          </EditField>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Identity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EditField label="Date of Birth" error={errors.dateOfBirth?.message} icon={<Calendar className="w-4 h-4" />}>
            <Input {...register('dateOfBirth')} type="date" className={errors.dateOfBirth ? 'border-red-400' : ''} />
          </EditField>
          <EditField label="National ID (CIN)" error={errors.cin?.message} icon={<CreditCard className="w-4 h-4" />}>
            <div className="relative">
              <Input
                {...register('cin')}
                type={cinVisible ? 'text' : 'password'}
                placeholder="••••••••"
                className={`pr-10 ${errors.cin ? 'border-red-400' : ''}`}
              />
              <button
                type="button"
                onClick={() => setCinVisible((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={cinVisible ? 'Hide CIN' : 'Show CIN'}
              >
                {cinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </EditField>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <EditField label="Street" error={errors.street?.message} icon={<MapPin className="w-4 h-4" />}>
            <Input {...register('street')} placeholder="123 Main St" className={errors.street ? 'border-red-400' : ''} />
          </EditField>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <EditField label="City" error={errors.city?.message} icon={<MapPin className="w-4 h-4" />}>
              <Input {...register('city')} placeholder="City" className={errors.city ? 'border-red-400' : ''} />
            </EditField>
            <EditField label="Province / State" error={errors.province?.message} icon={<MapPin className="w-4 h-4" />}>
              <Input {...register('province')} placeholder="Province" className={errors.province ? 'border-red-400' : ''} />
            </EditField>
            <EditField label="Postal Code" error={errors.postalCode?.message} icon={<MapPin className="w-4 h-4" />}>
              <Input {...register('postalCode')} placeholder="00000" className={errors.postalCode ? 'border-red-400' : ''} />
            </EditField>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving} className="gap-1.5">
          <X className="w-4 h-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving} className="min-w-35 bg-blue-600 hover:bg-blue-700">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
