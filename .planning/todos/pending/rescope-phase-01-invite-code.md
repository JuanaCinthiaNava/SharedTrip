---
title: "Re-scope Phase 01: replace magic-link with typed invite-code entry"
date: 2026-06-01
priority: high
relates_to: phase-01-foundation-auth
---

# Re-scope Phase 01 — typed invite-code entry, magic-link out

See decision note `entry-model-invite-code`. Goal: entry = type an invite code → anonymous join → set name. No magic link, no email in v1.

## Remove (magic-link path)

- [ ] Welcome screen `/` (`src/app/page.tsx`): remove the `MagicLinkForm`; replace with an **invite-code entry** UI (input + submit → `/join`-by-code).
- [ ] `src/actions/auth.ts`: remove `sendMagicLink` (keep `signOut`).
- [ ] `src/app/auth/callback/route.ts` and `src/app/auth/check-email/page.tsx`: remove (no PKCE email callback in v1). Confirm nothing else routes to them.
- [ ] `src/components/auth/MagicLinkForm.tsx`: remove.
- [ ] Drop the SMTP/Resend dependency from the v1 critical path (config can stay documented in `config.toml` but is no longer required for entry).

## Change (code-based join)

- [ ] `joinTrip` (`src/actions/members.ts`): resolve the trip by `invite_code` instead of `invite_token` (uuid). Update the resolution RPC accordingly (see todo `invite-code-schema`). Keep the anonymous sign-in + service-role membership insert from plan 06.
- [ ] New/updated entry screen: validate the typed code's format, normalize case (codes are case-insensitive when typed), trim whitespace, show a friendly error for unknown codes (`es.errors.invalidJoinToken` or a new code-specific string).
- [ ] Decide fate of `/join/[token]` route handler: keep as `/join/[code]` (so a code in the URL still works as a fallback) or remove. Per the decision it's code-only, but keeping the route as a code resolver is low-cost.

## Roadmap / requirements

- [ ] Move AUTH-01/02/03 (magic-link/email) out of Phase 01 → final phase (see seed `email-account-recovery`). Run `/gsd-phase`.
- [ ] Add/replace a requirement for code-based entry (e.g. ENTRY-01: "join a trip by typing a short hybrid invite code, anonymously, then set a display name").
- [ ] Update Phase 01 success criteria to reflect code entry (not magic link).

## Notes

- This re-touches an already-"complete" phase 01 — run it through a GSD planning/execute flow, not ad-hoc edits.
- Depends on `invite-code-schema` (the `invite_code` column must exist before join-by-code works).
