// ─────────────────────────────────────────────────────────────────
// Profile TypeScript Interfaces
// ─────────────────────────────────────────────────────────────────

export interface UserProfile {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  dateOfBirth: string; // ISO date string
  cin: string; // National ID
  address: {
    street: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'BLOCKED';
  documentVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'email' | 'phone';
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
}

export interface SecurityPreferences {
  twoFactorEnabled: boolean;
  twoFactorMethod?: 'app' | 'sms' | 'email';
}

export interface ActiveSession {
  sessionId: string;
  deviceName: string;
  location: string;
  lastActive: string; // ISO date string
  current: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface LoginHistoryEntry {
  id: string;
  date: string; // ISO date string
  device: string;
  ipAddress: string;
  location: string;
  status: 'SUCCESS' | 'FAILED';
}

export interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  language: 'en' | 'fr' | 'ar';
  triggers: {
    claimStatusUpdates: boolean;
    policyRenewalReminders: boolean;
    paymentConfirmations: boolean;
    securityAlerts: boolean;
  };
}

export interface ProfileDocument {
  documentId: string;
  name: string;
  originalName: string;
  type: 'NATIONAL_ID' | 'PASSPORT' | 'POLICY_DOCUMENT' | 'CLAIM_ATTACHMENT' | 'OTHER';
  mimeType: string;
  fileSize: number; // bytes
  uploadDate: string; // ISO date string
  expiryDate?: string; // ISO date string
  status: 'UPLOADED' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  url?: string;
}

export interface LinkedPolicy {
  policyId: string;
  policyNumber: string;
  policyType: 'AUTO' | 'HOME' | 'HEALTH' | 'LIFE';
  coverageType?: string;
  coverageAmount: number;
  premiumAmount: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'SUSPENDED';
}

// ─── Form Schemas (used with Zod) ───────────────────────────────

export interface PersonalInfoFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  cin: string;
  street: string;
  city: string;
  province: string;
  postalCode?: string;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
