'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, Bell, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PersonalInfoTab } from './PersonalInfoTab';
import { SecurityTab } from './SecurityTab';
import { NotificationsTab } from './NotificationsTab';
import { DocumentsTab } from './DocumentsTab';
import type {
  UserProfile,
  NotificationPreferences,
  ProfileDocument,
} from '@/types/profile';

interface ProfileTabsProps {
  profile: UserProfile;
  onProfileUpdated: () => void;
  notificationPrefs: NotificationPreferences;
  documents: ProfileDocument[];
  locale?: string;
  onLocaleChange?: (locale: string) => void;
}

export function ProfileTabs({
  profile,
  onProfileUpdated,
  notificationPrefs,
  documents,
  locale,
  onLocaleChange,
}: ProfileTabsProps) {
  const t = useTranslations('tabs');

  const TABS = [
    { value: 'personal', label: t('personalInfo'), icon: <User className="w-4 h-4" /> },
    { value: 'security', label: t('security'), icon: <Shield className="w-4 h-4" /> },
    { value: 'notifications', label: t('notifications'), icon: <Bell className="w-4 h-4" /> },
    { value: 'documents', label: t('documents'), icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <Tabs defaultValue="personal" className="w-full">
      {/* Tab Navigation */}
      <TabsList className="w-full sm:w-auto flex overflow-x-auto bg-white border border-gray-200 rounded-xl p-1 shadow-sm mb-6 gap-1 h-auto">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all
              data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow
              data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-50
              whitespace-nowrap"
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab Content */}
      <TabsContent value="personal" className="mt-0 focus-visible:outline-none">
        <PersonalInfoTab profile={profile} />
      </TabsContent>

      <TabsContent value="security" className="mt-0 focus-visible:outline-none">
        <SecurityTab profile={profile} onProfileUpdated={onProfileUpdated} />
      </TabsContent>

      <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
        <NotificationsTab preferences={notificationPrefs} locale={locale} onLocaleChange={onLocaleChange} />
      </TabsContent>

      <TabsContent value="documents" className="mt-0 focus-visible:outline-none">
        <DocumentsTab documents={documents} />
      </TabsContent>
    </Tabs>
  );
}
