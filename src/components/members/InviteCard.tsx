'use client'

// InviteCard — pinned invite card at top of the Gente tab (D-07/D-08/D-09).
// Shows the trip's invite_code prominently and copies a friendly Spanish message
// (deep-link + bare code) to the clipboard on button click.
// Copy = clipboard ONLY (D-08; no navigator.share).
// On success: Sonner success toast (es.invite.copiedToast).
// On failure (blocked/insecure context): Sonner error toast (es.errors.genericNetwork).
// Doubles as the empty state when the creator is the only member (D-07).

import { toast } from 'sonner'
import { es } from '@/i18n/es'
import { Button } from '@/components/ui/button'

interface InviteCardProps {
  /** Trip display name — used in the share message copy (D-09). */
  name: string
  /** The trip's invite_code (e.g. "MARR-4F9K") */
  code: string
}

export function InviteCard({ name, code }: InviteCardProps) {
  async function handleCopy() {
    const origin = window.location.origin
    const message = es.invite.shareMessage(name, code, origin)

    try {
      await navigator.clipboard.writeText(message)
      toast.success(es.invite.copiedToast)
    } catch {
      // Clipboard blocked (insecure context or permission denied — T-02-09 mitigated)
      toast.error(es.errors.genericNetwork)
    }
  }

  return (
    <div className="bg-surface rounded-lg p-6 flex flex-col gap-4">
      {/* Card title — 20px/700 */}
      <h2 className="text-xl font-bold leading-[1.3] text-fg">
        {es.invite.cardHeading}
      </h2>

      {/* Helper body — 14–16px/400 muted */}
      <p className="text-sm font-normal leading-[1.5] text-fg-muted">
        {es.invite.cardBody}
      </p>

      {/* Invite code — 20px/700, teal accent, tracking-wide (D-10 / UI-SPEC Typography) */}
      <p className="text-xl font-bold text-accent tracking-wide tabular-nums select-all">
        {code}
      </p>

      {/* CTA — full-width coral button */}
      <Button
        type="button"
        className="w-full"
        onClick={handleCopy}
      >
        {es.invite.copyCta}
      </Button>
    </div>
  )
}
