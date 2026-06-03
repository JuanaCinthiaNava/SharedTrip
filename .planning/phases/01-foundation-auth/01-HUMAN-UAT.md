---
status: passed
phase: 01-foundation-auth
source: [01-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T00:00:00Z
---

## Current Test

[all tests passed on real iPhone + Supabase Dashboard — approved 2026-06-02]

## Notes

Two UAT-driven fixes applied during testing (both committed + redeployed to prod):
- `cccf9c1` — re-join after sign-out failed with a network error (regression from code-review fix WR-01; the getUser() guard mistook a missing session for a network error). Reverted the guard.
- `e30b3bc` — session appeared not to persist on browser restart; root cause was `/` not redirecting an already-logged-in member into their trip. `/` is now session-aware. Cookie persistence itself was fine.

## Tests

### 1. Deploy to production and verify code-entry welcome screen renders on real iPhone
expected: vercel --prod --force succeeds; https://sharedtrip.vercel.app/ shows es.entry.heading ("Ingresa tu código de viaje") and an invite-CODE input (not email field) with "Entrar al viaje" button
result: passed

### 2. Typed-code happy path end-to-end on real iPhone (re-scoped AUTH-05)
expected: Type 'test-ab12' (lowercase, optional trailing space) on /; tap "Entrar al viaje"; lands at /t/11111111-.../docs within ~2s with no email, no login prompt, no upgrade banner; top header shows trip name and mango "Sin cuenta" pill
result: passed

### 3. Membership row created in DB (re-scoped AUTH-05 step 2)
expected: After typed-code join, Supabase SQL `SELECT user_id, role FROM public.trip_members WHERE trip_id='11111111-1111-1111-1111-111111111111' ORDER BY joined_at DESC LIMIT 5` shows new row with anonymous user_id and role='member'
result: passed

### 4. Pill is inert (D-11 static indicator)
expected: Tapping "Sin cuenta" pill does nothing — no upgrade sheet, no state change
result: passed

### 5. Session persists across browser restarts (AUTH-03)
expected: Force-quit Safari, reopen, navigate to /t/11111111-.../docs — still inside trip (not bounced to /)
result: passed

### 6. Sign out returns to code-entry welcome screen (AUTH-04)
expected: Perfil -> Cerrar sesión -> confirm -> arrives at / showing the InviteCodeForm (not email field)
result: passed

### 7. Unknown code error path
expected: Type 'NOPE-9999', tap submit, redirected back to / with Spanish toast "Este link de invitación no es válido…" (es.errors.invalidJoinToken); no membership created
result: passed

### 8. Malformed code inline validation (no network round-trip)
expected: Type 'hello' (no hyphen), tap submit — inline Spanish format error (es.entry.invalidFormat: "Revisa el código: formato como EJEM-AB12.") shown under field; no navigation, no network call
result: passed

### 9. Code-in-URL fallback (/join/[code] route)
expected: Navigate directly to https://{domain}/join/test-ab12 — same result as typed-code happy path
result: passed

### 10. GitHub Actions keep-alive manual run (INFRA-05)
expected: `gh workflow run keep-alive.yml` returns success; curl log shows HTTP 200 from Supabase REST endpoint
result: passed

### 11. Production manifest.webmanifest returns valid JSON after redeploy (PWA groundwork)
expected: GET https://sharedtrip.vercel.app/manifest.webmanifest returns HTTP 200, Content-Type: application/manifest+json, JSON has name 'SharedTrip', lang 'es', display 'standalone'
result: passed

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
