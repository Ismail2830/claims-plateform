// ─── Chatbot Types ────────────────────────────────────────────────────────────

export interface FlowStep {
  id: string
  botMessage: string | ((context: ClaimContext) => string)
  inputType: 'BUTTONS' | 'TEXT' | 'DATE' | 'AMOUNT' | 'FILE_UPLOAD' | 'CONFIRM' | 'SUMMARY'
  options?:
    | { label: string; value: string; emoji: string }[]
    | ((context: ClaimContext) => { label: string; value: string; emoji: string }[])
  placeholder?: string
  uploadDocType?: string
  uploadRequired?: boolean
  skipIf?: (context: ClaimContext) => boolean
  validate?: (input: string) => { valid: boolean; error?: string }
  saveToContext?: string
  nextStep: string | ((input: string, context: ClaimContext) => string)
}

export interface ClaimContext {
  claimType?: 'AUTO' | 'HABITATION' | 'SANTE' | 'VIE'
  incidentDate?: string
  incidentLocation?: string
  description?: string
  estimatedAmount?: string
  injuriesInvolved?: string | boolean
  otherVehicleInvolved?: string | boolean
  hasConstat?: string | boolean
  propertyHabitable?: string | boolean
  hospitalized?: boolean
  careType?: string
  beneficiary?: string
  damageType?: string
  uploadedDocs: string[]
  clientName?: string
  [key: string]: unknown
}

export interface BotResponse {
  message: string
  inputType: FlowStep['inputType']
  options?: { label: string; value: string; emoji: string }[]
  placeholder?: string
  uploadDocType?: string
  uploadRequired?: boolean
  docsProgress?: { required: string[]; uploaded: string[]; optional: string[] }
  summary?: ClaimSummary
  claimCreated?: { claimId: string; claimNumber: string; estimatedDays: number }
  isComplete?: boolean
  error?: string
  acknowledgmentMessage?: string
}

export interface ClaimSummary {
  claimType: string
  incidentDate?: string
  incidentLocation?: string
  estimatedAmount?: string
  description?: string
  damageType?: string
  beneficiary?: string
  careType?: string
  docsCount: number
}

export type ButtonOption = { label: string; value: string; emoji: string }
