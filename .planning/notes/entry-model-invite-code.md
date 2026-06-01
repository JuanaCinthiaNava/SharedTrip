---
title: "Entry model pivot — typed invite code, magic-link dropped from v1"
date: 2026-06-01
context: phase-01 re-scope / auth
---

# Entry model: typed invite code (anonymous), email deferred

## Decision

v1 entry to a trip is a **typed invite code** — no magic link, no login, no email.

- User opens SharedTrip → **types a short invite code** → joins **anonymously** → sets a **display name**.
- Code format is **hybrid**: short name-prefix + random suffix, e.g. `MARR-4F9K`. Memorable, self-descriptive, and unique (suffix avoids collisions between same-named trips).
- **Code only — no link.** The user shares the code in a chat (e.g. WhatsApp) and tells the group to enter it. (We discussed a link-that-opens-the-code-screen hybrid; the user chose strictly a typed code.)
- **Magic-link is removed from v1.**
- **Email, account recovery, and sending to arbitrary inboxes → final phase** (see seed `email-account-recovery`). These need a verified Resend domain, which the user will evaluate paying for later.

## Why we pivoted (context)

During phase-01 UAT we hit hard friction with the magic-link path:
- No verified domain → `onboarding@resend.dev` only delivers to the Resend account owner, so friends' inboxes can't receive links.
- The owner's inbox is `@definityfirst.com` (Microsoft 365), whose **Safe Links pre-fetches and consumes the one-time verify token** → "link expired" even on a fresh link (Test 4 unfixable without changing the flow/email).
- Email rate limits, SMTP config, and PKCE-cross-browser all added fragility for a feature that, for a close circle, adds little over anonymous join.

Meanwhile **anonymous join already works end-to-end** (phase-01 plan 06, verified on device). For a close-circle app, that's the frictionless path; formal accounts are incremental value, not core.

## Tradeoffs accepted

- **No recovery in v1.** Anonymous identity lives in a browser cookie. Clearing cookies or switching devices loses access until the email/recovery phase exists. Acceptable for v1 / close circle.
- **Code-in-chat needs context.** A bare code isn't self-explanatory like a link; the sharer must also point people to the app. Accepted (the circle is told where to go).

## Implications (tracked as todos)

- Re-scope phase 01: remove magic-link UI/code, make `/` a code-entry screen, join resolves by `invite_code` — see todo `rescope-phase-01-invite-code`.
- Schema: add `invite_code` to `trips`, update the seed trip, generate the code at trip creation (phase 2) — see todo `invite-code-schema`.
- ROADMAP: move AUTH-01/02/03 (magic-link/email) to the final phase. Run `/gsd-phase` to formalize.

## What stays

- Anonymous join (`joinTrip`, plan 06 — the service-role membership insert + SECURITY DEFINER token resolution). The resolution just switches from `invite_token` (uuid) to `invite_code` (typeable). See [[anon-join-architecture]].
- Display-name editing (plan 04/05 `ProfileNameEditor`).
