---
phase: 01-foundation-auth
plan: 07
subsystem: auth
tags: [supabase, resend, smtp, magic-link, email, rate-limit, config]

requires:
  - phase: 01-foundation-auth (plan 03)
    provides: signInWithOtp magic-link flow, /auth/callback PKCE handler, sendMagicLink action

provides:
  - Live Supabase project configured with Resend custom SMTP (magic-link email now sends/delivers)
  - Raised email_sent rate limit (2 -> 30) so sends don't exhaust the built-in cap
  - supabase/config.toml documents the live SMTP + rate-limit as source of truth (env-referenced key)
affects: [magic-link-auth, uat-test-3, uat-test-4]

tech-stack:
  added: [Resend SMTP (via Supabase Auth)]
  patterns:
    - "Live auth email config lives in the Supabase Dashboard; config.toml mirrors it (no app code change)"

key-files:
  created: []
  modified:
    - supabase/config.toml

key-decisions:
  - "Sender stays onboarding@resend.dev (user has no custom domain). It delivers ONLY to the Resend account owner — acceptable for v1 owner testing; friends use the anonymous /join path, not magic link."
  - "email_sent raised to 30 (from the built-in default of 2) now that custom SMTP is enabled."

patterns-established:
  - "Email-deliverability is a live-config concern (Supabase Dashboard), documented in config.toml — never patched in app source."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

duration: ~spanning session (live config by user + repo doc)
completed: 2026-06-01
---

# Phase 01 · Plan 07 Summary

**Magic-link email now sends and is delivered (Test 3 closed): custom Resend SMTP enabled on the live project, email rate limit raised, and the configuration documented in `config.toml`. No application code changed — this was a live-config fix, as diagnosed.**

## Performance

- **Completed:** 2026-06-01
- **Tasks:** Task 1 (live config) ✅ by user via dashboard · Checkpoint (delivery) — Test 3 ✅ / Test 4 blocked by env · Task 2 (config.toml) ✅
- **Files modified:** 1 (`supabase/config.toml`)

## Accomplishments

- **Task 1 (live):** Custom Resend SMTP enabled on project `vumiszpfiftmvyrfyixf` (host `smtp.resend.com`, port 465, user `resend`, pass = Resend API key, sender `onboarding@resend.dev`). The original failure was diagnosed as 429 `over_email_send_rate_limit`; by the time of this session the live state had moved to a send attempt — confirmed by a fresh-email POST returning HTTP **500** "Error sending confirmation email" (expected for a NON-owner recipient on the shared `onboarding@resend.dev` sender) rather than 429.
- **Checkpoint (human-verify):** The user confirmed a magic-link email **arrives** to the Resend-owner address on a real iPhone → **Test 3 passes.**
- **Task 2:** `supabase/config.toml` now documents the live config — uncommented `[auth.email.smtp]` for Resend with `pass = "env(RESEND_API_KEY)"` (no literal secret) and `[auth.rate_limit].email_sent = 30`.

## Verification (Task 2 automated)

- `[auth.email.smtp]` block present, `smtp.resend.com`, `env(RESEND_API_KEY)`, no literal `re_…` key, `email_sent` ≠ 2 → **PASS** (the broad `re_…` regex's only hit is `secu**re_passwo**rd_change`, a false positive).

## ⚠️ Outstanding / known limitations

1. **Live "Emails per hour" must be set to 30 in the dashboard** to match the documented `config.toml`. As of last check the live value was still **2** — raise it at Authentication → Rate Limits (or magic-link sends will 429 after ~2/hour).
2. **Test 4 (clicking the magic link) is blocked by Microsoft Safe Links**, NOT an app bug. The user's only deliverable address (the Resend account owner) is `@definityfirst.com` (Microsoft 365), whose Safe Links pre-fetches the verify URL and **consumes the one-time PKCE token** before the user clicks → the app's `/auth/callback` then shows `invalid_link`. The decoded link confirmed this: `nam10.safelinks.protection.outlook.com/?url=…supabase.co/auth/v1/verify?token=pkce_…`.
   **Paths to close Test 4 (user chose to try a Gmail-owned Resend account):**
   - **OTP code entry** (most robust, scanner-proof): the email subject already carries the 6-digit code (`Acceso a tu viaje · {{ .Token }}`); add a code input on `/auth/check-email` + a `verifyOtp` server action. *Not yet built — offered.*
   - **Gmail-owned Resend account**: create a Resend account under a personal Gmail, update the Supabase SMTP password to its API key, then test with that Gmail (no Safe Links). *In progress by user.*
   - **Verified custom domain** in Resend: the real long-term fix to deliver magic links to any recipient.
3. **Magic link to friends' arbitrary inboxes** requires a verified domain (current sender only reaches the account owner). Mitigated for v1 by the anonymous `/join` path being the primary friend entry (closed in plan 01-06).

## Note on scope

01-07's deliverable was the **email-send** fix (Test 3) — done. Test 4 (link click) surfaced a downstream, environment-driven blocker (corporate Safe Links) rather than a code defect; tracked above for follow-up.
