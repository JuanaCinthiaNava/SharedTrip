---
title: "Email account recovery + invite to arbitrary inboxes"
trigger_condition: "Final phase, OR when a custom sending domain is purchased/verified in Resend"
planted_date: 2026-06-01
relates_to: AUTH-01, AUTH-02, AUTH-03
---

# Seed: email-based recovery + invites to any inbox

## Idea

Once v1 ships with anonymous code-entry only, add an **email layer** for:
1. **Account recovery / persistence** — let an anonymous user attach an email so they can regain access after clearing cookies or switching devices (the gap deliberately accepted in v1).
2. **Inviting people to arbitrary inboxes** — send a magic link / OTP to anyone's email, not just the Resend account owner.

This is where the deferred **AUTH-01/02/03** requirements (magic-link / passwordless email) land.

## Trigger

- The final milestone phase, OR
- As soon as a **custom domain is verified in Resend** (the hard blocker today — `onboarding@resend.dev` only delivers to the account owner). The user will evaluate the domain cost later.

## Important design lessons already learned (don't relearn the hard way)

- **Microsoft Safe Links (and similar scanners) consume one-time magic-link tokens** on pre-fetch → clicked links read as "expired." So for email entry, prefer **OTP code entry** (type a 6-digit code from the email; the email subject already carries `{{ .Token }}`) over click-the-link. Code entry is scanner-proof and cross-device.
- The existing PKCE `/auth/callback` flow needs the `code_verifier` cookie in the same browser — fragile on mobile. A `token_hash` + `verifyOtp` flow (or OTP code) avoids that.
- See note `entry-model-invite-code` and SUMMARY `01-07` for the full diagnosis.

## Scope when it activates

- Email-attach flow for existing anonymous users (upgrade path — plan 05's `AnonymousUpgradeSheet` is a starting point).
- OTP-code entry UI (input + `verifyOtp` server action) as the primary email-auth mechanism.
- Verified-domain sender config in Resend + Supabase SMTP (config already documented in `supabase/config.toml`).
