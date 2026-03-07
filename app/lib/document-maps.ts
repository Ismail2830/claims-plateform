/**
 * document-maps.ts
 * Centralised UI metadata for DocumentType, DocumentStatus, required-doc rules.
 */

import {
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Archive,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

// ─── Type Aliases ─────────────────────────────────────────────────────────────

export type DocumentType =
  | 'PHOTO'
  | 'PDF'
  | 'INVOICE'
  | 'ESTIMATE'
  | 'POLICE_REPORT'
  | 'MEDICAL_REPORT'
  | 'IDENTITY_DOCUMENT'
  | 'INSURANCE_CERTIFICATE'
  | 'CONSTAT'
  | 'EXPERTISE_REPORT'
  | 'DEATH_CERTIFICATE'
  | 'HOSPITAL_BILL'
  | 'PRESCRIPTION'
  | 'VEHICLE_REGISTRATION'
  | 'DRIVERS_LICENSE'
  | 'BANK_DETAILS'
  | 'LEGAL_DOCUMENT'
  | 'OTHER';

export type DocumentStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'ARCHIVED'
  | 'PENDING_RESUBMIT';

export type UploadSource = 'WEB' | 'WHATSAPP' | 'MOBILE' | 'AGENT';

// ─── DOCUMENT_TYPE_LABELS ─────────────────────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PHOTO:                 'Photo dommage',
  PDF:                   'Document PDF',
  INVOICE:               'Facture',
  ESTIMATE:              'Devis réparation',
  POLICE_REPORT:         'Rapport de police',
  MEDICAL_REPORT:        'Rapport médical',
  IDENTITY_DOCUMENT:     'Pièce d\'identité',
  INSURANCE_CERTIFICATE: 'Attestation assurance',
  CONSTAT:               'Constat amiable',
  EXPERTISE_REPORT:      'Rapport d\'expertise',
  DEATH_CERTIFICATE:     'Acte de décès',
  HOSPITAL_BILL:         'Facture hospitalière',
  PRESCRIPTION:          'Ordonnance médicale',
  VEHICLE_REGISTRATION:  'Carte grise',
  DRIVERS_LICENSE:       'Permis de conduire',
  BANK_DETAILS:          'RIB bancaire',
  LEGAL_DOCUMENT:        'Document légal',
  OTHER:                 'Autre',
};

// ─── DOCUMENT_TYPE_COLORS ─────────────────────────────────────────────────────

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  PHOTO:                 'bg-purple-100 text-purple-800',
  PDF:                   'bg-gray-100 text-gray-800',
  INVOICE:               'bg-green-100 text-green-800',
  ESTIMATE:              'bg-teal-100 text-teal-800',
  POLICE_REPORT:         'bg-blue-100 text-blue-800',
  MEDICAL_REPORT:        'bg-pink-100 text-pink-800',
  IDENTITY_DOCUMENT:     'bg-orange-100 text-orange-800',
  INSURANCE_CERTIFICATE: 'bg-indigo-100 text-indigo-800',
  CONSTAT:               'bg-yellow-100 text-yellow-800',
  EXPERTISE_REPORT:      'bg-cyan-100 text-cyan-800',
  DEATH_CERTIFICATE:     'bg-gray-200 text-gray-900',
  HOSPITAL_BILL:         'bg-rose-100 text-rose-800',
  PRESCRIPTION:          'bg-lime-100 text-lime-800',
  VEHICLE_REGISTRATION:  'bg-sky-100 text-sky-800',
  DRIVERS_LICENSE:       'bg-amber-100 text-amber-800',
  BANK_DETAILS:          'bg-emerald-100 text-emerald-800',
  LEGAL_DOCUMENT:        'bg-violet-100 text-violet-800',
  OTHER:                 'bg-gray-100 text-gray-600',
};

// ─── DOCUMENT_STATUS_CONFIG ───────────────────────────────────────────────────

export interface StatusConfig {
  label:       string;
  color:       string;
  icon:        LucideIcon;
  description: string;
}

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, StatusConfig> = {
  UPLOADED: {
    label:       'Uploadé',
    color:       'bg-blue-100 text-blue-800',
    icon:        Upload,
    description: 'Document reçu, en attente d\'examen',
  },
  PROCESSING: {
    label:       'En cours d\'examen',
    color:       'bg-yellow-100 text-yellow-800',
    icon:        RefreshCw,
    description: 'Document en cours de vérification',
  },
  VERIFIED: {
    label:       'Vérifié',
    color:       'bg-green-100 text-green-800',
    icon:        CheckCircle,
    description: 'Document validé par le gestionnaire',
  },
  REJECTED: {
    label:       'Rejeté',
    color:       'bg-red-100 text-red-800',
    icon:        XCircle,
    description: 'Document refusé',
  },
  EXPIRED: {
    label:       'Expiré',
    color:       'bg-orange-100 text-orange-800',
    icon:        AlertTriangle,
    description: 'Document arrivé à expiration',
  },
  ARCHIVED: {
    label:       'Archivé',
    color:       'bg-gray-100 text-gray-600',
    icon:        Archive,
    description: 'Document archivé',
  },
  PENDING_RESUBMIT: {
    label:       'À re-soumettre',
    color:       'bg-red-50 text-red-700',
    icon:        RotateCcw,
    description: 'Document rejeté — nouvelle soumission requise',
  },
};

// ─── REQUIRED_DOCUMENTS ───────────────────────────────────────────────────────

export const REQUIRED_DOCUMENTS: Record<string, DocumentType[]> = {
  AUTO: [
    'CONSTAT',
    'PHOTO',
    'IDENTITY_DOCUMENT',
    'VEHICLE_REGISTRATION',
    'DRIVERS_LICENSE',
  ],
  HOME: [
    'PHOTO',
    'ESTIMATE',
    'INVOICE',
    'IDENTITY_DOCUMENT',
  ],
  HEALTH: [
    'MEDICAL_REPORT',
    'PRESCRIPTION',
    'HOSPITAL_BILL',
    'IDENTITY_DOCUMENT',
    'BANK_DETAILS',
  ],
  LIFE: [
    'IDENTITY_DOCUMENT',
    'DEATH_CERTIFICATE',
    'LEGAL_DOCUMENT',
    'BANK_DETAILS',
  ],
};

// ─── SOURCE_LABELS ────────────────────────────────────────────────────────────

export const UPLOAD_SOURCE_LABELS: Record<UploadSource, string> = {
  WEB:       'Web',
  WHATSAPP:  'WhatsApp',
  MOBILE:    'Mobile',
  AGENT:     'Agent',
};

// ─── ACCESS_ACTION_LABELS ─────────────────────────────────────────────────────

export const ACCESS_ACTION_LABELS: Record<string, string> = {
  VIEW:     'Consultation',
  DOWNLOAD: 'Téléchargement',
  VERIFY:   'Vérification',
  REJECT:   'Rejet',
  DELETE:   'Suppression',
  UPLOAD:   'Upload',
};
