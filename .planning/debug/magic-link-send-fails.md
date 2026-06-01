---
status: diagnosed
trigger: "magic-link-send-fails — production iPhone magic link request shows es.errors.sendLinkFailed toast, no email delivered"
created: 2026-06-01
updated: 2026-06-01
---

## Current Focus

hypothesis: CONFIRMED — signInWithOtp() returns HTTP 429 over_email_send_rate_limit. The project is hitting Supabase's built-in mailer project-wide rate limit (default ~2-4 emails/hour), which is only this low when custom SMTP is NOT active. Custom Resend SMTP is effectively not in force on the live project.
test: One diagnostic POST to live /auth/v1/otp with a pre-used email, then two POSTs with brand-new unique emails.
expecting: If per-email max_frequency (60s) → fresh emails would succeed. If project-wide built-in cap → fresh emails also 429.
next_action: DIAGNOSIS COMPLETE — return root cause. No fix (find_root_cause_only mode).

## Symptoms

expected: User enters email on https://sharedtrip.vercel.app, submits, sees Spanish "check your email" confirmation, email arrives ~30s with subject "Acceso a tu viaje · {token}".
actual: Red error toast "No pudimos enviarte el enlace..." appears immediately. No confirmation screen, no email delivered.
errors: Toast = es.errors.sendLinkFailed, returned when signInWithOtp() returns an error.
reproduction: Test 3 in 01-UAT.md — request a magic link from the production welcome screen.
started: Discovered during Phase 01 UAT (2026-06-01); first real-device email test.

## Eliminated

## Evidence

- timestamp: 2026-06-01
  checked: src/actions/auth.ts sendMagicLink()
  found: Calls signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` } }). Returns error.message verbatim mapped to sendLinkFailed by the form.
  implication: Any signInWithOtp error (SMTP failure, rate limit, bad redirect) surfaces as this toast. NEXT_PUBLIC_APP_URL drives emailRedirectTo.

- timestamp: 2026-06-01
  checked: 01-03-SUMMARY.md "Configuration Applied Post-SUMMARY"
  found: smtp_admin_email = onboarding@resend.dev (Resend free/shared domain). max_frequency 60s. site_url + uri_allow_list set to sharedtrip.vercel.app/auth/callback + localhost.
  implication: onboarding@resend.dev only delivers to the verified Resend account owner's email; other recipients → Supabase 500 "Error sending magic link email". (NOTE: this hypothesis was NOT what the live endpoint returned — see below.)

- timestamp: 2026-06-01T19:05Z
  checked: Live POST https://vumiszpfiftmvyrfyixf.supabase.co/auth/v1/otp (one diagnostic request, real key)
  found: HTTP/2 429. Header x-sb-error-code: over_email_send_rate_limit. Body: {"code":429,"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}. sb-request-id 019e8493-4052-7602-9b69-c1bb26eb8ece.
  implication: signInWithOtp is NOT failing on SMTP delivery or redirect allow-list — it is being rejected BEFORE send by a rate limit. This is the exact error mapped to the user toast.

- timestamp: 2026-06-01T19:05Z
  checked: Two follow-up POSTs to /auth/v1/otp with brand-new, never-before-used unique emails (diag-{epoch}-{rand}@example.com)
  found: Both also returned HTTP 429 over_email_send_rate_limit immediately.
  implication: DECISIVE. The per-email max_frequency (60s) limit cannot apply to emails never previously submitted. A fresh-email 429 means the PROJECT-WIDE hourly mailer cap is exhausted. This cap is ~2-4/hour only when the built-in Supabase mailer is in use — i.e. custom Resend SMTP is NOT actually active/enabled on the live project (or auth.rate_limit.email_sent was never raised, which itself requires SMTP enabled per config.toml line 198).

- timestamp: 2026-06-01T19:06Z
  checked: GET /auth/v1/settings (public GoTrue settings)
  found: {"external":{...,"email":true,...},"disable_signup":false,"mailer_autoconfirm":false,"anonymous_users":true,...}
  implication: Email provider enabled, mailer_autoconfirm false (emails ARE attempted, not skipped). Consistent with mailer being reached and throttled. (Endpoint does not expose SMTP host, so SMTP-enabled state confirmed indirectly via the rate-limit threshold behavior above.)

- timestamp: 2026-06-01T19:06Z
  checked: supabase/config.toml [auth.rate_limit] / [auth.email.smtp] + Supabase Rate Limits docs (web)
  found: config.toml line 198: "Number of emails that can be sent per hour. Requires auth.email.smtp to be enabled." [auth.email.smtp] block is commented out. Supabase docs: built-in mailer default is ~2-4 emails/hour project-wide; with working custom SMTP the limit is governed by the provider and is far higher. https://supabase.com/docs/guides/auth/rate-limits
  implication: Confirms the mechanism: low project-wide hourly cap == built-in mailer path, not Resend. Raising email_sent rate limit also requires SMTP enabled — so either SMTP did not persist or the rate limit was never raised. Either way the live project is throttling magic-link sends to a handful per hour.

## Resolution

root_cause: |
  signInWithOtp() on the live project returns HTTP 429 over_email_send_rate_limit ("email rate
  limit exceeded"). The application correctly surfaces this as es.errors.sendLinkFailed. The bug is
  in the LIVE SUPABASE AUTH CONFIGURATION, not the app code: the project is bound by Supabase's
  built-in mailer project-wide rate limit (~2-4 emails/hour). Brand-new, never-used email addresses
  also receive 429 immediately, which rules out the per-recipient max_frequency (60s) limit and
  proves the hourly project cap is exhausted. This low cap is only in effect when custom Resend SMTP
  is NOT actually active (config.toml documents that a raised email rate limit "Requires
  auth.email.smtp to be enabled"). Conclusion: the Resend custom SMTP documented in
  01-03-SUMMARY "Configuration Applied Post-SUMMARY" is not in force on the live project (not saved,
  reverted, or the email_sent rate limit was never raised), so all magic-link sends share the tiny
  built-in quota and fail once it is spent.
fix: "" # find_root_cause_only mode — not applied
verification: "" # not applied
files_changed: []
notes: |
  The earlier "onboarding@resend.dev can only send to the Resend account owner" hypothesis was NOT
  confirmed — the endpoint never reached the SMTP send stage; it was rejected by the rate limiter
  first. That SMTP-sender constraint may still surface as a SECOND failure once the rate limit is
  resolved (it would manifest as a 500 "Error sending magic link email" for non-owner recipients),
  so the fix should also move off onboarding@resend.dev to a verified custom domain.
