'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, X, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth'
import {
  determineGreeting,
  type GreetingResult,
  type ClientClaimSummary,
} from '@/app/lib/chatbot/greeting-engine'
import {
  isFirstVisit,
  hasNewUpdateSinceLastVisit,
  recordVisit,
  recordSeenClaims,
} from '@/app/lib/chatbot/visit-tracker'
import { playSound, canPlaySound, muteSound, unmuteSound, isSoundMuted } from '@/app/lib/chatbot/sounds'
import { TypewriterText } from '@/components/client/TypewriterText'
import { GreetingButtons } from '@/components/client/GreetingButtons'
import { SoundToggle } from '@/components/client/SoundToggle'
import { PulsingBadge } from '@/components/client/PulsingBadge'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardSummary {
  client: { firstName: string; lastName: string; avatarUrl: string | null }
  claims: ClientClaimSummary
}

const NEEDS_ATTENTION_SCENARIOS = ['DOCS_PENDING', 'CLAIM_APPROVED', 'CLAIM_REJECTED']

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

function makeFetcher(token: string) {
  return async (url: string): Promise<DashboardSummary> => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('fetch error')
    return res.json() as Promise<DashboardSummary>
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartChatWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const { token } = useSimpleAuth()

  const [open, setOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [greeting, setGreeting] = useState<GreetingResult | null>(null)
  const [subVisible, setSubVisible] = useState(false)
  const [autoOpened, setAutoOpened] = useState(false)
  const hoverRef = useRef(false)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const greetingComputedRef = useRef(false)

  // SWR with 60s refresh
  const { data, isLoading } = useSWR<DashboardSummary>(
    token ? '/api/client/dashboard-summary' : null,
    token ? makeFetcher(token) : null,
    { refreshInterval: 60000, revalidateOnFocus: false },
  )

  // Initialise mute state from localStorage after mount
  useEffect(() => {
    setMuted(isSoundMuted())
  }, [])

  // Collapse on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Compute greeting once data arrives (only on first load)
  useEffect(() => {
    if (!data || greetingComputedRef.current) return
    greetingComputedRef.current = true

    const claims: ClientClaimSummary = data.claims ?? {
      totalActive: 0,
      pendingDocsClaims: [],
      recentlyApproved: [],
      recentlyRejected: [],
      inProgressClaims: [],
    }

    const firstName = data.client?.firstName ?? ''
    const firstVisit = isFirstVisit()
    const hasUpdate = hasNewUpdateSinceLastVisit(claims)

    const result = determineGreeting(firstName, claims, firstVisit, hasUpdate)
    setGreeting(result)

    recordVisit()
    recordSeenClaims(claims)

    if (result.widgetOpenByDefault) {
      setTimeout(() => {
        setOpen(true)
        setAutoOpened(true)
      }, 1500)
    }

    if (result.sound && canPlaySound()) {
      setTimeout(() => {
        if (canPlaySound()) playSound(result.sound!)
      }, 1800)
    }
  }, [data])

  // Auto-close after 12s if auto-opened and user hasn't hovered
  useEffect(() => {
    if (open && autoOpened) {
      autoCloseTimerRef.current = setTimeout(() => {
        if (!hoverRef.current) {
          setOpen(false)
          setAutoOpened(false)
        }
      }, 12000)
    }
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    }
  }, [open, autoOpened])

  const handleToggleSound = useCallback(() => {
    if (muted) {
      unmuteSound()
      setMuted(false)
    } else {
      muteSound()
      setMuted(true)
    }
  }, [muted])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setAutoOpened(false) // user-opened: don't auto-close
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
  }, [])

  const collapse = useCallback(() => {
    setOpen(false)
    setAutoOpened(false)
    setSubVisible(false)
  }, [])

  const needsAttention =
    greeting !== null &&
    NEEDS_ATTENTION_SCENARIOS.includes(greeting.scenario)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="w-[340px] max-sm:w-full max-sm:right-0 max-sm:bottom-0 max-sm:rounded-b-none bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col origin-bottom-right animate-scale-in"
          onMouseEnter={() => { hoverRef.current = true }}
          onMouseLeave={() => { hoverRef.current = false }}
        >
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-bold leading-none">ISM Bot</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <p className="text-[10px] text-blue-200">En ligne</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SoundToggle isMuted={muted} onToggle={handleToggleSound} />
              <button
                onClick={collapse}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-4">
            {isLoading ? (
              /* Loading skeleton */
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 animate-pulse" />
                  <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-5 w-3/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="mt-4 space-y-2">
                  <div className="h-11 bg-blue-100 rounded-xl animate-pulse" />
                  <div className="h-11 bg-gray-100 rounded-xl animate-pulse" />
                </div>
              </div>
            ) : greeting ? (
              <>
                {/* Bot avatar + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
                    🤖
                  </div>
                  <p className="text-sm text-blue-600 font-medium">ISM Bot</p>
                </div>

                {/* Scenario icon hint */}
                {greeting.scenario === 'DOCS_PENDING' && (
                  <div className="flex items-center gap-1.5 mb-2 text-orange-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-medium">Action requise</p>
                  </div>
                )}
                {greeting.scenario === 'CLAIM_APPROVED' && (
                  <div className="flex items-center gap-1.5 mb-2 text-green-600">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-medium">Mise à jour importante</p>
                  </div>
                )}

                {/* Greeting main message — typewriter */}
                <p className="text-base font-semibold text-gray-900 mt-1 leading-snug">
                  <TypewriterText
                    text={greeting.message}
                    speed={30}
                    onComplete={() => setSubVisible(true)}
                  />
                </p>

                {/* Sub message — fade in after typewriter */}
                {greeting.subMessage && (
                  <p
                    className={`text-sm text-gray-600 mt-2 leading-relaxed transition-opacity duration-500 ${
                      subVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    {greeting.subMessage}
                  </p>
                )}

                <hr className="my-4 border-gray-100" />

                {/* Action buttons */}
                <GreetingButtons
                  primary={greeting.primaryButton}
                  secondary={greeting.secondaryButton}
                  onNavigate={collapse}
                />

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">💬 Besoin d'aide?</p>
                  <button
                    onClick={() => { collapse(); router.push('/dashboard/client/messages') }}
                    className="text-xs text-blue-500 underline hover:no-underline cursor-pointer"
                  >
                    Contacter un conseiller
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Collapsed button ───────────────────────────────────────────────── */}
      {!open && (
        <button
          onClick={handleOpen}
          className={`relative w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
          aria-label="Ouvrir l'assistant ISM Bot"
        >
          {/* Pulsing ring for attention scenarios */}
          {!isLoading && needsAttention && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          )}

          <Bot className="w-7 h-7 text-white relative z-10" />

          {/* Badge */}
          {!isLoading && greeting && greeting.badgeCount > 0 && (
            <PulsingBadge count={greeting.badgeCount} />
          )}
        </button>
      )}
    </div>
  )
}
