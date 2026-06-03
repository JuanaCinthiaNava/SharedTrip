---
status: superseded
phase: 01-foundation-auth
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md]
started: 2026-06-01T18:51:05Z
updated: 2026-06-02T00:00:00Z
superseded_by: 01-HUMAN-UAT.md
---

## Current Test

[SUPERSEDED 2026-06-02] This UAT predates the 2026-06-01 re-scope. Its blocked tests and
2 diagnosed issues were all caused by the magic-link entry path (Test 3 magic link + the
old token-based anonymous join) — that path was REMOVED from v1 by the re-scope. Entry is
now a typed invite code, re-verified end-to-end on a real iPhone (11/11 passed) in
`01-HUMAN-UAT.md`. No action remains here; these items are obsolete, not outstanding.

## Tests

### 1. Cold Start Smoke Test
expected: Fresh Safari load of https://sharedtrip.vercel.app — welcome screen appears within ~2s, no error/blank page, Spanish content + coral "SharedTrip" wordmark visible.
result: pass

### 2. Welcome Screen
expected: The landing page shows the coral "SharedTrip" wordmark, a Spanish heading ("Bienvenido a SharedTrip"), a subheading, and an email field with a "send link" button — all in Spanish, no English anywhere.
result: pass

### 3. Request Magic Link → Email Arrives
expected: Type your email, submit. UI shows a brief spinner then a Spanish "check your email" confirmation screen. Within ~30s an email arrives with subject starting "Acceso a tu viaje · " followed by a code. Sending a second link gives a DIFFERENT subject code (so Gmail does not thread them).
result: issue
reported: "me lanza un error de no pudimos enviar el email"
severity: blocker

### 4. Magic Link Login + Session Persists
expected: Tap the link in the email → returns to the app already signed in (no password). Force-quit Safari, reopen the app — you are still signed in (session survived restart).
result: blocked
blocked_by: prior-phase
reason: "Cannot test — no email arrives (Test 3 failed: 'no pudimos enviar el email')"

### 5. Anonymous Join via Invite Link
expected: In a fresh Safari tab (or private mode), open https://sharedtrip.vercel.app/join/22222222-2222-2222-2222-222222222222 — within ~2s you land inside the trip at the Documentos tab, with NO email or login prompt.
result: issue
reported: "Incorrecto, me dice que ese link de invitacion esta mal"
severity: blocker

### 6. Anonymous Indicators (pill + banner)
expected: While in the trip as an anonymous user, the top header shows a mango "Sin cuenta" pill, and a mango-striped banner appears below the header nudging you to add an email. The banner has a dismiss (X) and an "Agregar email" button.
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — both entry paths broken (Test 3 magic link + Test 5 anonymous join)"

### 7. Trip Shell — Tab Navigation
expected: A bottom tab bar shows four tabs (Documentos, Itinerario, Gente, Perfil). Tapping each switches content; the active tab is highlighted coral. Empty tabs show a friendly Spanish empty-state message (not a blank screen).
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — both entry paths broken (Test 3 magic link + Test 5 anonymous join)"

### 8. Trip Switcher Sheet
expected: Tapping the trip name / switcher in the header slides up a bottom sheet listing your trips, with a "Crear nuevo viaje" option (may be disabled in Phase 1). Sheet closes cleanly.
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — both entry paths broken (Test 3 magic link + Test 5 anonymous join)"

### 9. Edit Profile Name
expected: On the Perfil tab, edit your display name and save. A Spanish success toast appears, and the name/avatar in the header updates to reflect the change.
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — both entry paths broken (Test 3 magic link + Test 5 anonymous join)"

### 10. Sign Out
expected: On the Perfil tab, tap sign out. A confirmation dialog appears (Spanish). Confirming returns you to the welcome screen, signed out. Cancelling keeps you in the app.
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — both entry paths broken (Test 3 magic link + Test 5 anonymous join)"

### 11. Anonymous Upgrade (add email, keep membership)
expected: As an anonymous user, tap the "Sin cuenta" pill or banner "Agregar email". A bottom sheet asks for your email. Submit → Spanish toast confirms a confirmation email was sent. You remain in the same trip (membership preserved, still see the trip and its tabs).
result: blocked
blocked_by: prior-phase
reason: "Cannot enter trip shell — depends on anonymous session (Test 5 anonymous join broken)"

### 12. PWA Install / Manifest
expected: https://sharedtrip.vercel.app/manifest.webmanifest loads valid JSON (not 404). In Safari, "Add to Home Screen" installs the app with a coral icon and the name "SharedTrip"; opening from the home screen launches in standalone (no Safari chrome).
result: pass
note: "Manifest route returns valid JSON (prior production 404 from VERIFICATION.md resolved). Full 'Add to Home Screen' install not exercised — manifest serving correctly was the gating check."

## Summary

total: 12
passed: 3
issues: 2
pending: 0
skipped: 0
blocked: 7

## Gaps

- truth: "User requests magic link; UI shows check-email confirmation and an email arrives within ~30s with unique subject 'Acceso a tu viaje · {token}'"
  status: failed
  reason: "User reported: me lanza un error de no pudimos enviar el email"
  severity: blocker
  test: 3
  root_cause: "Live Supabase auth returns HTTP 429 over_email_send_rate_limit on signInWithOtp. Custom Resend SMTP is NOT actually active on the live project (the [auth.email.smtp] config documented in 01-03-SUMMARY is not saved/enabled), so Supabase falls back to its built-in mailer with a ~2-4 emails/hour project-wide cap, which is exhausted. App code (src/actions/auth.ts) is correct — it faithfully surfaces the 429 as es.errors.sendLinkFailed. Fault is in live Supabase config, not the repo. Secondary latent issue: sender onboarding@resend.dev only delivers to the Resend account owner, which will surface as a 500 once the rate limit clears."
  artifacts:
    - path: "Live Supabase project vumiszpfiftmvyrfyixf (Auth → SMTP Settings + [auth.rate_limit].email_sent)"
      issue: "Custom Resend SMTP not enabled/saved; built-in mailer hourly cap exhausted (HTTP 429 over_email_send_rate_limit captured on POST /auth/v1/otp)"
    - path: "supabase/config.toml"
      issue: "[auth.email.smtp] block commented out; documents SMTP→rate-limit dependency"
    - path: "src/actions/auth.ts"
      issue: "No bug — correctly passes through the 429 error message"
  missing:
    - "Enable/save custom Resend SMTP on the live Supabase project (Auth → SMTP Settings)"
    - "Move sender off shared onboarding@resend.dev to a verified custom domain so the iPhone test address (non-owner) can receive mail"
    - "Raise [auth.rate_limit].email_sent once SMTP is confirmed enabled"
    - "Re-run diagnostic POST /auth/v1/otp with a fresh email — expect HTTP 200"
  debug_session: .planning/debug/magic-link-send-fails.md

- truth: "Opening /join/{seed-invite-token} signs the user in anonymously and lands them inside the trip shell (Documentos tab) with no email/login prompt"
  status: failed
  reason: "User reported: me dice que ese link de invitacion esta mal (invite token rejected as invalid)"
  severity: blocker
  test: 5
  root_cause: "RLS chicken-and-egg. joinTrip() (src/actions/members.ts) looks up the trip by invite_token with .single() BEFORE inserting the trip_members row, and that query runs as the freshly-created anonymous user under RLS. The only trips SELECT policy gates on is_trip_member(id), so a non-member anon user sees 0 rows → PGRST116 → mapped to es.errors.invalidJoinToken, even though token + trip are valid. Confirmed by direct observation: service-role query returns the seed row; identical query as an anon user (after successful signInAnonymously) returns []. The join can NEVER succeed because there is no RLS path to resolve a trip by invite_token before membership exists."
  artifacts:
    - path: "src/actions/members.ts"
      issue: "joinTrip() queries trips by invite_token under RLS before membership exists; maps PGRST116 to invalidJoinToken"
    - path: "supabase/migrations/20260530000001_initial_schema.sql (lines ~157-160)"
      issue: "Sole trips SELECT policy USING (is_trip_member(id)); no policy/path allows lookup by invite_token"
    - path: "src/app/join/[token]/page.tsx"
      issue: "Surfaces the error as redirect to /?error= (no bug — downstream of the failed lookup)"
  missing:
    - "Add a SECURITY DEFINER Postgres function get_trip_id_by_invite_token(token uuid) RETURNS uuid, SET search_path = public, that resolves trip id for a valid token bypassing the membership-gated RLS"
    - "Change joinTrip() to call supabase.rpc('get_trip_id_by_invite_token', { token }) instead of the direct trips.select().single()"
    - "New migration adding the function; verify trip_members upsert + /t/[tripId] shell load work for the now-member anon user"
  debug_session: .planning/debug/anon-join-invalid-token.md
