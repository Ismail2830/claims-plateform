import type { ClientClaimSummary } from './greeting-engine'

const STORAGE_KEY = 'ism_last_visit'
const STORAGE_CLAIMS_KEY = 'ism_last_seen_claims'

interface StoredClaimState {
  claimId: string
  claimNumber: string
  wasApproved: boolean
  wasRejected: boolean
}

export function isFirstVisit(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(STORAGE_KEY) === null
  } catch {
    return false
  }
}

export function getLastVisitTime(): Date | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Date(stored) : null
  } catch {
    return null
  }
}

export function recordVisit(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch { /* silent */ }
}

export function hasNewUpdateSinceLastVisit(claims: ClientClaimSummary): boolean {
  if (typeof window === 'undefined') return false
  const lastVisit = getLastVisitTime()
  if (!lastVisit) return false

  try {
    const storedRaw = localStorage.getItem(STORAGE_CLAIMS_KEY)
    if (!storedRaw) {
      // First time seeing claims — treat as new if there are approved/rejected
      return (
        claims.recentlyApproved.length > 0 || claims.recentlyRejected.length > 0
      )
    }

    const prev: StoredClaimState[] = JSON.parse(storedRaw)
    const prevMap = new Map(prev.map((c) => [c.claimId, c]))

    // Check if any currently approved/rejected claim was NOT in previous approved/rejected state
    for (const c of claims.recentlyApproved) {
      const prev = prevMap.get(c.claimId)
      if (!prev || !prev.wasApproved) return true
    }
    for (const c of claims.recentlyRejected) {
      const prev = prevMap.get(c.claimId)
      if (!prev || !prev.wasRejected) return true
    }

    return false
  } catch {
    return false
  }
}

export function recordSeenClaims(claims: ClientClaimSummary): void {
  if (typeof window === 'undefined') return
  try {
    const approvedIds = new Set(claims.recentlyApproved.map((c) => c.claimId))
    const rejectedIds = new Set(claims.recentlyRejected.map((c) => c.claimId))

    const allIds = new Set([
      ...claims.recentlyApproved.map((c) => c.claimId),
      ...claims.recentlyRejected.map((c) => c.claimId),
      ...claims.inProgressClaims.map((c) => c.claimId),
      ...claims.pendingDocsClaims.map((c) => c.claimId),
    ])

    const states: StoredClaimState[] = Array.from(allIds).map((id) => {
      const approvedClaim = claims.recentlyApproved.find((c) => c.claimId === id)
      const rejectedClaim = claims.recentlyRejected.find((c) => c.claimId === id)
      const anyChain =
        approvedClaim ?? rejectedClaim ??
        claims.inProgressClaims.find((c) => c.claimId === id) ??
        claims.pendingDocsClaims.find((c) => c.claimId === id)
      return {
        claimId: id,
        claimNumber: anyChain?.claimNumber ?? '',
        wasApproved: approvedIds.has(id),
        wasRejected: rejectedIds.has(id),
      }
    })

    localStorage.setItem(STORAGE_CLAIMS_KEY, JSON.stringify(states))
  } catch { /* silent */ }
}
