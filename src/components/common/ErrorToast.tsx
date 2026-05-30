'use client'

// ErrorToast — shows a toast.error when the welcome page receives an `error` search param.
// Used after redirect from /join/[token] or /auth/callback on failure.
// The `error` param is the already-translated Spanish string from es.errors.*.
// Security: we display the raw value only because all callers encode known es.errors strings.
// An unknown value shows the generic network error instead of echoing attacker input (T-05-07).

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { es } from '@/i18n/es'

// Allowed error values — maps to known es.errors strings.
// Any unknown value falls back to genericNetwork (prevents reflected XSS echo of raw input).
const KNOWN_ERRORS: Set<string> = new Set([
  es.errors.invalidLink,
  es.errors.sendLinkFailed,
  es.errors.invalidJoinToken,
  es.errors.sessionExpired,
  es.errors.genericNetwork,
])

export function ErrorToast() {
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (!errorParam) return

    // Decode and validate — only show known Spanish error strings (T-05-07 mitigation)
    const decoded = decodeURIComponent(errorParam)
    const message = KNOWN_ERRORS.has(decoded) ? decoded : es.errors.genericNetwork

    // Show error toast — duration 6s per UI-SPEC
    toast.error(message, { duration: 6000 })
  }, [errorParam])

  // This component renders nothing — it only triggers the side-effect toast
  return null
}
