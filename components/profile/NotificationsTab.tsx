'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Bell, Mail, MessageSquare, Smartphone, Globe, Shield, FileText, CreditCard, RefreshCw } from 'lucide-react';
import type { NotificationPreferences } from '@/types/profile';

interface NotificationsTabProps {
  preferences: NotificationPreferences;
  locale?: string;
  onLocaleChange?: (locale: string) => void;
}

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '' },
  { value: 'fr', label: 'Français', flag: '' },
  { value: 'ar', label: 'العربية', flag: '' },
] as const;

const TRIGGER_KEYS = [
  { key: 'claimStatusUpdates' as const, icon: <FileText className="w-4 h-4" /> },
  { key: 'policyRenewalReminders' as const, icon: <RefreshCw className="w-4 h-4" /> },
  { key: 'paymentConfirmations' as const, icon: <CreditCard className="w-4 h-4" /> },
  { key: 'securityAlerts' as const, icon: <Shield className="w-4 h-4" /> },
];

export function NotificationsTab({ preferences, locale, onLocaleChange }: NotificationsTabProps) {
  const t = useTranslations('notifications');
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    ...preferences,
    language: (locale as typeof preferences.language) ?? preferences.language,
  });
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (locale) {
      setPrefs((prev) => ({ ...prev, language: locale as typeof prev.language }));
    }
  }, [locale]);

  const updateChannel = (channel: keyof NotificationPreferences['channels'], value: boolean) => {
    setPrefs((prev) => ({ ...prev, channels: { ...prev.channels, [channel]: value } }));
  };

  const updateTrigger = (trigger: keyof NotificationPreferences['triggers'], value: boolean) => {
    setPrefs((prev) => ({ ...prev, triggers: { ...prev.triggers, [trigger]: value } }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(t('savedSuccess'));
    } catch {
      toast.error(t('savedError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-500" />
            {t('channels.title')}
          </CardTitle>
          <CardDescription>{t('channels.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{t('channels.email')}</p>
                <p className="text-xs text-gray-500">{t('channels.emailDesc')}</p>
              </div>
            </div>
            <Switch
              checked={prefs.channels.email}
              onCheckedChange={(v) => updateChannel('email', v)}
              aria-label="Email notifications"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{t('channels.sms')}</p>
                <p className="text-xs text-gray-500">{t('channels.smsDesc')}</p>
              </div>
            </div>
            <Switch
              checked={prefs.channels.sms}
              onCheckedChange={(v) => updateChannel('sms', v)}
              aria-label="SMS notifications"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">{t('channels.inApp')}</p>
                <p className="text-xs text-gray-500">{t('channels.inAppDesc')}</p>
              </div>
            </div>
            <Switch
              checked={prefs.channels.inApp}
              onCheckedChange={(v) => updateChannel('inApp', v)}
              aria-label="In-app notifications"
            />
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            {t('language.title')}
          </CardTitle>
          <CardDescription>{t('language.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => {
                  setPrefs((prev) => ({ ...prev, language: lang.value }));
                  onLocaleChange?.(lang.value);
                }}
                className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  prefs.language === lang.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            {t('triggers.title')}
          </CardTitle>
          <CardDescription>{t('triggers.desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TRIGGER_KEYS.map((opt, i) => (
            <React.Fragment key={opt.key}>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-gray-400">{opt.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t(`triggers.${opt.key}`)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t(`triggers.${opt.key}Desc`)}</p>
                  </div>
                </div>
                <Switch
                  checked={prefs.triggers[opt.key]}
                  onCheckedChange={(v) => updateTrigger(opt.key, v)}
                  aria-label={t(`triggers.${opt.key}`)}
                />
              </div>
              {i < TRIGGER_KEYS.length - 1 && <Separator />}
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-40 bg-blue-600 hover:bg-blue-700">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('savePreferences')
          )}
        </Button>
      </div>
    </div>
  );
}
