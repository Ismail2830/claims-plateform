'use client'

import {
  useEffect, useRef, useState, useCallback,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Bot, FileText, Send, Paperclip, X, AlertCircle,
} from 'lucide-react'
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth'
import ChatBubble from '@/app/components/chat/ChatBubble'
import ChatButtonOptions from '@/app/components/chat/ChatButtonOptions'
import ChatFileUpload from '@/app/components/chat/ChatFileUpload'
import ChatSummaryCard from '@/app/components/chat/ChatSummaryCard'
import ChatConfirmationCard from '@/app/components/chat/ChatConfirmationCard'
import ChatTypingIndicator from '@/app/components/chat/ChatTypingIndicator'
import ChatProgressBar from '@/app/components/chat/ChatProgressBar'
import type { BotResponse } from '@/app/lib/chatbot/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalMessage {
  id: string
  role: 'USER' | 'BOT' | 'SYSTEM'
  content: string
  timestamp: Date
  inputType?: BotResponse['inputType']
  options?: { label: string; value: string; emoji: string }[]
  uploadDocType?: string
  uploadRequired?: boolean
  summary?: BotResponse['summary']
  claimCreated?: BotResponse['claimCreated']
  isComplete?: boolean
  buttonsDisabled?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2)
}

function randomDelay() {
  return 800 + Math.random() * 400
}

const AUTO_STEPS = [
  'AUTO_DATE', 'AUTO_DATE_CUSTOM', 'AUTO_LOCATION', 'AUTO_INJURIES',
  'AUTO_EMERGENCY', 'AUTO_OTHER_VEHICLE', 'AUTO_CONSTAT', 'AUTO_AMOUNT',
  'AUTO_DESCRIPTION', 'AUTO_DOCS_PHOTO', 'AUTO_DOCS_CONSTAT',
  'AUTO_DOCS_PERMIS', 'AUTO_SUMMARY', 'AUTO_CONFIRM',
]
const HOME_STEPS = [
  'HOME_DAMAGE_TYPE', 'HOME_DATE', 'HOME_HABITABLE', 'HOME_EMERGENCY_HOUSING',
  'HOME_POLICE', 'HOME_AMOUNT', 'HOME_DESCRIPTION', 'HOME_DOCS_PHOTO',
  'HOME_DOCS_DEVIS', 'HOME_DOCS_MAINC', 'HOME_SUMMARY', 'HOME_CONFIRM',
]
const HEALTH_STEPS = [
  'HEALTH_FOR_WHOM', 'HEALTH_CARE_TYPE', 'HEALTH_DATE', 'HEALTH_PAID',
  'HEALTH_AMOUNT', 'HEALTH_DOCS', 'HEALTH_DOCS_ORDONNANCE',
  'HEALTH_DOCS_RAPPORT', 'HEALTH_DOCS_RIB', 'HEALTH_SUMMARY', 'HEALTH_CONFIRM',
]
const VIE_STEPS = [
  'VIE_EVENT_TYPE', 'VIE_BENEFICIARY', 'VIE_DATE', 'VIE_DESCRIPTION',
  'VIE_DOCS_IDENTITE', 'VIE_SUMMARY', 'VIE_CONFIRM',
]
const STEP_MAP: Record<string, string[]> = {
  AUTO: AUTO_STEPS,
  HABITATION: HOME_STEPS,
  SANTE: HEALTH_STEPS,
  VIE: VIE_STEPS,
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AssistantPage() {
  const router = useRouter()
  const { token, isLoading: authLoading } = useSimpleAuth()

  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [currentInputType, setCurrentInputType] = useState<BotResponse['inputType']>('BUTTONS')
  const [currentOptions, setCurrentOptions] = useState<{ label: string; value: string; emoji: string }[]>([])
  const [uploadInfo, setUploadInfo] = useState<{ docType: string; required: boolean } | null>(null)
  const [claimType, setClaimType] = useState<string>('AUTO')
  const [currentStep, setCurrentStep] = useState<string>('START')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth headers
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token ?? ''}`,
  }), [token])

  // Scroll to bottom
  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  useEffect(scrollToBottom, [messages, isLoading])

  // Apply bot response to local state
  function applyBotResponse(resp: BotResponse) {
    setCurrentInputType(resp.inputType)
    setCurrentOptions(resp.options ?? [])
    setIsComplete(resp.isComplete ?? false)

    if (resp.inputType === 'FILE_UPLOAD') {
      setUploadInfo({ docType: resp.uploadDocType ?? 'OTHER', required: resp.uploadRequired ?? false })
    } else {
      setUploadInfo(null)
    }

    const msg: LocalMessage = {
      id: uid(),
      role: 'BOT',
      content: resp.message,
      timestamp: new Date(),
      inputType: resp.inputType,
      options: resp.options,
      uploadDocType: resp.uploadDocType,
      uploadRequired: resp.uploadRequired,
      summary: resp.summary,
      claimCreated: resp.claimCreated,
      isComplete: resp.isComplete,
    }
    setMessages((prev) => [...prev, msg])
  }

  // ── Start session on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token || authLoading) return

    // Resume active session if any, otherwise start a new one
    async function init() {
      setIsLoading(true)
      try {
        const histRes = await fetch('/api/chat/history', { headers: authHeaders() })
        if (histRes.ok) {
          const { sessions } = await histRes.json()
          const active = sessions?.find((s: { status: string }) => s.status === 'ACTIVE')
          if (active) {
            // Load existing messages for this session
            const msgRes = await fetch(`/api/chat/${active.sessionId}/messages`, { headers: authHeaders() })
            if (msgRes.ok) {
              const data: {
                messages: Array<{
                  id: string
                  role: 'USER' | 'BOT' | 'SYSTEM'
                  content: string
                  metadata: Record<string, unknown> | null
                  createdAt: string
                }>
                claimType: string | null
                currentStep: string
                sessionStatus: string
              } = await msgRes.json()

              if (data.messages.length > 0) {
                setSessionId(active.sessionId)
                if (data.claimType) setClaimType(data.claimType)
                setCurrentStep(data.currentStep)

                // Rebuild local messages from DB
                const loaded: LocalMessage[] = data.messages.map((m, i) => {
                  const isLast = i === data.messages.length - 1
                  const meta = m.metadata as {
                    type?: BotResponse['inputType']
                    options?: { label: string; value: string; emoji: string }[]
                    uploadDocType?: string
                  } | null
                  return {
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.createdAt),
                    inputType: isLast && m.role === 'BOT' ? meta?.type ?? undefined : undefined,
                    options: isLast && m.role === 'BOT' ? meta?.options ?? undefined : undefined,
                    uploadDocType: isLast && m.role === 'BOT' ? meta?.uploadDocType ?? undefined : undefined,
                    buttonsDisabled: !isLast,
                  }
                })
                setMessages(loaded)

                // Restore input state from last bot message metadata
                const lastBot = [...data.messages].reverse().find((m) => m.role === 'BOT')
                if (lastBot?.metadata) {
                  const meta = lastBot.metadata as {
                    type?: BotResponse['inputType']
                    options?: { label: string; value: string; emoji: string }[]
                    uploadDocType?: string
                  }
                  setCurrentInputType(meta.type ?? 'TEXT')
                  setCurrentOptions(meta.options ?? [])
                  if (meta.type === 'FILE_UPLOAD' && meta.uploadDocType) {
                    setUploadInfo({ docType: meta.uploadDocType, required: true })
                  }
                }

                setIsLoading(false)
                return // Successfully resumed — don't start a new session
              }
            }
          }
        }
      } catch { /* non-blocking; fall through to start new session */ }

      // Start a new session
      try {
        const res = await fetch('/api/chat/start', {
          method: 'POST',
          headers: authHeaders(),
        })
        if (!res.ok) throw new Error('Erreur démarrage session')
        const data: { sessionId: string; response: BotResponse } = await res.json()
        setSessionId(data.sessionId)

        setTimeout(() => {
          applyBotResponse(data.response)
          setIsLoading(false)
        }, randomDelay())
      } catch {
        setError('Impossible de démarrer la session. Veuillez réessayer.')
        setIsLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

  // ── Send text/button message ────────────────────────────────────────────────
  async function sendMessage(content: string, displayLabel?: string) {
    if (!sessionId || isLoading || isComplete) return
    setError(null)

    // Handle post-claim navigation buttons locally — don't send to API
    if (content.startsWith('view:')) {
      const claimId = content.slice(5)
      router.push(`/dashboard/client/claims/${claimId}`)
      return
    }
    if (content === 'dashboard') {
      router.push('/dashboard/client')
      return
    }

    // Detect claimType from START
    if (currentStep === 'START' && ['AUTO', 'HABITATION', 'SANTE', 'VIE'].includes(content)) {
      setClaimType(content)
      setCurrentStep(STEP_MAP[content]?.[0] ?? 'DONE')
    }

    // Add user message optimistically — show French label if provided
    const userMsg: LocalMessage = {
      id: uid(),
      role: 'USER',
      content: displayLabel ?? content,
      timestamp: new Date(),
    }
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, buttonsDisabled: true })),
      userMsg,
    ])
    setText('')
    setCurrentInputType('TEXT')
    setCurrentOptions([])

    setIsLoading(true)

    try {
      const res = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error('Erreur réseau')
      const data: { response: BotResponse } = await res.json()

      const delay = randomDelay()
      if (data.response.acknowledgmentMessage) {
        // Show acknowledgment bubble first, keep typing indicator alive, then show next step
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'BOT',
              content: data.response.acknowledgmentMessage!,
              timestamp: new Date(),
            },
          ])
          // isLoading stays true — typing indicator visible between the two bot bubbles
        }, delay)
        setTimeout(() => {
          applyBotResponse(data.response)
          setIsLoading(false)
          if (data.response.isComplete) setCurrentStep('DONE')
        }, delay + 700)
      } else {
        setTimeout(() => {
          applyBotResponse(data.response)
          setIsLoading(false)
          // Update current step tracking
          if (data.response.isComplete) {
            setCurrentStep('DONE')
          }
        }, delay)
      }
    } catch {
      setIsLoading(false)
      setError('Une erreur est survenue. Veuillez réessayer.')
    }
  }

  // ── File upload ─────────────────────────────────────────────────────────────
  async function handleFileUpload(file: File, docType: string) {
    if (!sessionId) throw new Error('Session manquante')
    const form = new FormData()
    form.append('file', file)
    form.append('docType', docType)

    const res = await fetch(`/api/chat/${sessionId}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Erreur upload')
    }
    const data: { response: BotResponse } = await res.json()

    // User message for the doc
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'USER',
        content: `📎 Document envoyé: ${docType}`,
        timestamp: new Date(),
        buttonsDisabled: true,
      },
    ])

    setIsLoading(true)
    setTimeout(() => {
      applyBotResponse(data.response)
      setIsLoading(false)
    }, randomDelay())
  }

  // Skip optional file upload
  async function handleSkipUpload() {
    if (!sessionId || !uploadInfo) return
    await sendMessage('SKIP_OPTIONAL', '⏭️ Passer ce document')
  }

  // Textarea auto-resize
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 90) + 'px'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (text.trim()) sendMessage(text.trim())
    }
  }

  // Exit guard
  function handleBack() {
    if (messages.length > 1 && !isComplete) {
      setShowExitModal(true)
    } else {
      router.back()
    }
  }

  const showTextInput =
    !isComplete &&
    (currentInputType === 'TEXT' || currentInputType === 'AMOUNT' || currentInputType === 'DATE')

  const progressSteps = STEP_MAP[claimType] ?? []

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">ISM Bot</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-[10px] text-gray-500">En ligne</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSwitchModal(true)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Formulaire
          </button>
        </div>

        {/* Progress bar */}
        {claimType !== 'AUTO' || currentStep !== 'START' ? (
          <div className="max-w-2xl mx-auto border-t border-gray-100">
            <ChatProgressBar
              steps={progressSteps}
              currentStep={currentStep}
              claimType={claimType}
            />
          </div>
        ) : null}
      </header>

      {/* ── Messages area ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Skeleton loading while starting */}
          {messages.length === 0 && isLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className={`h-10 bg-gray-200 rounded-2xl animate-pulse ${i === 1 ? 'w-48' : 'w-64'}`} />
                </div>
              ))}
            </div>
          )}

          {messages.map((msg, idx) => {
            const isLast = idx === messages.length - 1
            return (
              <div key={msg.id} className="space-y-2">
                <ChatBubble
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                />

                {/* Confirmation card */}
                {msg.claimCreated && (
                  <ChatConfirmationCard
                    claimNumber={msg.claimCreated.claimNumber}
                    estimatedDays={msg.claimCreated.estimatedDays}
                    claimId={msg.claimCreated.claimId}
                  />
                )}

                {/* Summary card */}
                {msg.summary && !msg.claimCreated && (
                  <ChatSummaryCard
                    summary={msg.summary}
                    onConfirm={() => sendMessage('confirm', '✅ Confirmer et soumettre')}
                    onEdit={() => sendMessage('edit', '✏️ Modifier')}
                    disabled={msg.buttonsDisabled || !isLast}
                  />
                )}

                {/* Button choices */}
                {msg.options && msg.options.length > 0 && !msg.summary && (
                  <ChatButtonOptions
                    options={msg.options}
                    onSelect={(val, label) => sendMessage(val, label)}
                    disabled={msg.buttonsDisabled || !isLast || isLoading || isComplete}
                  />
                )}

                {/* File upload zone */}
                {msg.inputType === 'FILE_UPLOAD' && isLast && !isComplete && (
                  <ChatFileUpload
                    docType={msg.uploadDocType ?? 'OTHER'}
                    required={msg.uploadRequired ?? false}
                    onUpload={handleFileUpload}
                    onSkip={handleSkipUpload}
                    disabled={isLoading}
                  />
                )}
              </div>
            )
          })}

          {/* Typing indicator */}
          {isLoading && messages.length > 0 && <ChatTypingIndicator />}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input area ─────────────────────────────────────────────────────── */}
      {showTextInput && (
        <footer className="sticky bottom-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-end gap-2">
            <div className="flex-1 flex items-end bg-gray-100 rounded-2xl px-3 py-2 gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre réponse... (Entrée pour envoyer)"
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-900 placeholder:text-gray-400 max-h-[90px]"
              />
              <button className="text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
                <Paperclip className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => text.trim() && sendMessage(text.trim())}
              disabled={!text.trim() || isLoading}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </footer>
      )}

      {/* ── Exit confirm modal ─────────────────────────────────────────────── */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Quitter la conversation?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Votre progression sera perdue. Êtes-vous sûr de vouloir quitter?
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setShowExitModal(false)
                  if (sessionId) {
                    await fetch(`/api/chat/${sessionId}`, {
                      method: 'DELETE',
                      headers: authHeaders(),
                    }).catch(() => {})
                  }
                  router.back()
                }}
                className="flex-1 bg-red-50 text-red-600 font-medium py-2.5 rounded-xl text-sm hover:bg-red-100 transition-colors"
              >
                Quitter
              </button>
              <button
                onClick={() => setShowExitModal(false)}
                className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Switch to form modal ───────────────────────────────────────────── */}
      {showSwitchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">Passer au formulaire classique?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Votre progression dans l'assistant sera perdue.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSwitchModal(false)
                  router.push('/dashboard/client/claims/new/form')
                }}
                className="flex-1 bg-gray-100 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                Ouvrir le formulaire
              </button>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                Rester ici
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
