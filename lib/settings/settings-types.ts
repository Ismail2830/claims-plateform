// ─── Platform Settings TypeScript Types ──────────────────────────────────────

export interface SlaEntry {
  warningDays: number;
  criticalDays: number;
}

export interface GeneralSettings {
  platformName: string;
  slogan: string;
  logoUrl: string | null;
  address: string;
  phone: string;
  email: string;
  website: string;
  acapsLicense: string;
  language: 'fr' | 'ar' | 'en';
  timezone: string;
  currency: 'MAD' | 'EUR' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
}

export interface ClaimsSettings {
  approvalLimits: {
    MANAGER_JUNIOR: number;
    MANAGER_SENIOR: number;
  };
  slaByType: {
    AUTO: SlaEntry;
    HABITATION: SlaEntry;
    SANTE: SlaEntry;
    VIE: SlaEntry;
  };
  workload: {
    maxPerManager: number;
    warningPercent: number;
    criticalPercent: number;
  };
  autoReassign: {
    enabled: boolean;
    afterDays: number;
  };
  activeTypes: string[];
  claimNumberFormat: string;
  resetCounterYearly: boolean;
}

export interface RiskThresholdRange {
  min: number;
  max: number;
}

export interface ScoringSettings {
  thresholds: {
    low: RiskThresholdRange;
    medium: RiskThresholdRange;
    high: RiskThresholdRange;
    suspicious: RiskThresholdRange;
  };
  autoActions: {
    escalateAbove: number;
    blockApprovalAbove: number;
    notifyAdminAbove: number;
  };
  weights: {
    claimsHistory: number;
    amountVsAverage: number;
    declarationDelay: number;
    documentCoherence: number;
    clientProfile: number;
    geolocationPattern: number;
    behavioralFactors: number;
  };
  autoScoring: boolean;
  recalculateOnDocUpload: boolean;
  recalculateOnStatusChange: boolean;
}

export interface SmtpSettings {
  host: string;
  port: number;
  security: 'TLS' | 'SSL' | 'NONE';
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailTriggers {
  newClaim: boolean;
  statusChanged: boolean;
  documentRejected: boolean;
  claimResolved: boolean;
  slaBreached: boolean;
  highRiskScore: boolean;
  reportGenerated: boolean;
}

export interface EmailSettings {
  smtp: SmtpSettings;
  triggers: EmailTriggers;
  signature: string;
}

export interface IntegrationsSettings {
  whatsapp: { token: string; phoneNumber: string };
  pusher: { appId: string; key: string; secret: string; cluster: string };
  storage: { provider: 'local' | 'cloudinary' | 's3'; maxSizeMB: number };
}

export interface NotificationTriggers {
  newClaimAssigned: boolean;
  documentUploaded: boolean;
  aiScoreCalculated: boolean;
  claimEscalated: boolean;
  approvalRequired: boolean;
  slaBreached: boolean;
  newMessage: boolean;
  reportGenerated: boolean;
}

export interface NotificationsSettings {
  sound: boolean;
  badgeCount: boolean;
  autoMarkReadDelay: number | null;
  groupSimilar: boolean;
  triggers: NotificationTriggers;
}

export interface SecuritySettings {
  sessionDurationHours: number;
  maxLoginAttempts: number;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
}

export interface MonitoringSettings {
  storageLimitGB: number;
  retentionDays: number;
}

export interface PlatformSettings {
  general: GeneralSettings;
  claims: ClaimsSettings;
  scoring: ScoringSettings;
  email: EmailSettings;
  integrations: IntegrationsSettings;
  notifications: NotificationsSettings;
  security: SecuritySettings;
  monitoring: MonitoringSettings;
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  general: {
    platformName: 'ISM Assurance',
    slogan: 'Votre assurance de confiance',
    logoUrl: null,
    address: '',
    phone: '',
    email: 'contact@ism-assurance.ma',
    website: 'https://ism-assurance.ma',
    acapsLicense: '',
    language: 'fr',
    timezone: 'Africa/Casablanca',
    currency: 'MAD',
    dateFormat: 'DD/MM/YYYY',
  },
  claims: {
    approvalLimits: {
      MANAGER_JUNIOR: 10000,
      MANAGER_SENIOR: 100000,
    },
    slaByType: {
      AUTO:       { warningDays: 7,  criticalDays: 14 },
      HABITATION: { warningDays: 10, criticalDays: 21 },
      SANTE:      { warningDays: 5,  criticalDays: 10 },
      VIE:        { warningDays: 30, criticalDays: 60 },
    },
    workload: {
      maxPerManager: 20,
      warningPercent: 80,
      criticalPercent: 100,
    },
    autoReassign: {
      enabled: true,
      afterDays: 3,
    },
    activeTypes: ['AUTO', 'HABITATION', 'SANTE', 'VIE'],
    claimNumberFormat: 'CLM-{YYYY}-{NNNNNN}',
    resetCounterYearly: true,
  },
  scoring: {
    thresholds: {
      low:        { min: 0,  max: 30 },
      medium:     { min: 31, max: 60 },
      high:       { min: 61, max: 80 },
      suspicious: { min: 81, max: 100 },
    },
    autoActions: {
      escalateAbove:      81,
      blockApprovalAbove: 90,
      notifyAdminAbove:   95,
    },
    weights: {
      claimsHistory:       25,
      amountVsAverage:     20,
      declarationDelay:    15,
      documentCoherence:   15,
      clientProfile:       10,
      geolocationPattern:  10,
      behavioralFactors:   5,
    },
    autoScoring:                 true,
    recalculateOnDocUpload:      true,
    recalculateOnStatusChange:   true,
  },
  email: {
    smtp: {
      host:      '',
      port:      587,
      security:  'TLS',
      user:      '',
      password:  '',
      fromName:  'ISM Assurance',
      fromEmail: 'noreply@ism-assurance.ma',
    },
    triggers: {
      newClaim:          true,
      statusChanged:     true,
      documentRejected:  true,
      claimResolved:     true,
      slaBreached:       true,
      highRiskScore:     true,
      reportGenerated:   true,
    },
    signature: 'ISM Assurance — Service Sinistres',
  },
  integrations: {
    whatsapp: { token: '', phoneNumber: '' },
    pusher:   { appId: '', key: '', secret: '', cluster: 'eu' },
    storage:  { provider: 'local', maxSizeMB: 10240 },
  },
  notifications: {
    sound:             true,
    badgeCount:        true,
    autoMarkReadDelay: null,
    groupSimilar:      true,
    triggers: {
      newClaimAssigned:   true,
      documentUploaded:   true,
      aiScoreCalculated:  true,
      claimEscalated:     true,
      approvalRequired:   true,
      slaBreached:        true,
      newMessage:         true,
      reportGenerated:    true,
    },
  },
  security: {
    sessionDurationHours: 8,
    maxLoginAttempts:     5,
    twoFactorEnabled:     false,
    ipWhitelist:          [],
  },
  monitoring: {
    storageLimitGB: 10,
    retentionDays:  90,
  },
};
