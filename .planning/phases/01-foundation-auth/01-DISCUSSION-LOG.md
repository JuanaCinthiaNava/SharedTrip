# Phase 1: Foundation + Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 01-Foundation+Auth
**Areas discussed:** Magic link email experience, Visual identity & app shell, Anonymous-join → upgrade flow, Profile & identity model

---

## Magic link email experience

### SMTP provider

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | 3K emails/mo free. Better deliverability. Custom "from" address. ~30 min setup + a domain. | ✓ |
| Supabase built-in SMTP | Zero setup. Generic `noreply@mail.supabase.io`. Lands in Gmail Promotions. 4 emails/hour rate limit. | |
| Start with Supabase, switch to Resend if mail lands in spam | Ship Phase 1 with built-in, flag Resend setup as Phase 5 polish triggered by real-user feedback. | |

**User's choice:** Resend.
**Notes:** Deliverability is critical for the friend-circle invite UX, so committing to Resend from day 1 rather than risking spam on the first real test.

### Sender identity

| Option | Description | Selected |
|--------|-------------|----------|
| `SharedTrip <hola@sharedtrip.app>` | Generic brand sender. Most app-like. Requires owning the domain. | |
| Your personal name `<name@yourdomain>` — e.g., "Cristian (SharedTrip) <cristian@...>" | Feels personal — invitee recognizes the sender. Best fit for small friend circle. | ✓ |
| Defer — use Supabase/Resend defaults for v1 | Don't block Phase 1 on this. | |

**User's choice:** Personal name `Cristian (SharedTrip) <cristian@{domain}>`.

### Subject line

| Option | Description | Selected |
|--------|-------------|----------|
| `Tu enlace para SharedTrip · 14:32` | Branded + timestamp suffix. Clean, anti-threading via timestamp. | |
| `Entra a SharedTrip (14:32)` | Action-first, casual tone. Timestamp in parens. | |
| `Código de acceso #a3F9` | Short random code in subject. Maximum anti-threading. Less friendly. | |
| `Acceso a tu viaje · 14:32` | References "your trip" — contextual, emotionally connected to use case. | ✓ |

**User's choice:** `Acceso a tu viaje · HH:mm`.
**Notes:** "your trip" framing reinforces the use case in every email. Timestamp suffix defeats Gmail threading per Pitfall 5.

### Body tone

| Option | Description | Selected |
|--------|-------------|----------|
| Personal & warm — "Hola, aquí va tu enlace. Expira en 15 min." | First person, casual. Matches personal sender. 2-3 sentences. | |
| Branded & friendly — "Hola 👋 Toca el botón para entrar a tu viaje en SharedTrip." | Brand-led, single emoji, polished CTA button. Spotify/Duolingo transactional style. | ✓ |
| Minimal — just a big button + security footer | Almost no copy. Big tap target. | |
| Claude's discretion | Skip the detail. | |

**User's choice:** Branded & friendly.

---

## Visual identity & app shell

### Color palette

| Option | Description | Selected |
|--------|-------------|----------|
| Tropical sunset (dark) — coral / teal / mango / midnight navy | Vacation-coded warm + cool palette on near-black bg. Highest "travel vibe". | ✓ |
| Duolingo-electric — electric green / cobalt / lemon | Loud, gamified. Reads "kids app". | |
| Spotify-deep — vivid green on near-black | Dark-mode-first media-app aesthetic. Doc thumbnails pop. | |
| Tropical sunset (light) — coral/teal/mango on warm cream | Same hues, light bg. Postcard-like. | |

**User's choice:** Tropical sunset, dark-mode default.

### Navigation pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar (3-4 tabs) | iOS/Android native feel. Thumb-friendly. Best for repeated daily use. | ✓ |
| Top header + segmented control | Trip name in header, segmented control below. More content area. | |
| Hub-and-spoke single trip dashboard | Trip page IS the hub. Big cards. No persistent nav. | |

**User's choice:** Bottom tab bar — Docs / Itin / Gente / Perfil.

### Typography

| Option | Description | Selected |
|--------|-------------|----------|
| Inter | Tailwind/shadcn default. Neutral, free, fast. | ✓ |
| Geist + Geist Mono | Vercel's font, modern geometric. Mono useful for codes. | |
| Plus Jakarta Sans + Caveat | Friendly humanist + handwritten accent. "Travel journal" personality. | |
| Claude's discretion | Pick a free Google Font that matches palette. | |

**User's choice:** Inter — lets the palette do the talking.

### Brand mark

| Option | Description | Selected |
|--------|-------------|----------|
| Wordmark only — "SharedTrip" in coral, slight italic | Lightweight. No designer dependency. | ✓ |
| Emoji-glyph mark — ✈️ or 🌍 + wordmark | Free, ships today. System-native. | |
| Custom SVG glyph | Highest polish, adds Phase 1 dependency. | |
| Claude's discretion — generate SVG mark | Have Claude generate a tasteful mark. | |

**User's choice:** Wordmark only. Real glyph deferred to Phase 5 polish.

### Multi-trip switching

| Option | Description | Selected |
|--------|-------------|----------|
| Trip name in header → dropdown of all trips + "Crear nuevo viaje" | No separate Trips screen. Header dropdown is the entry point. | ✓ |
| Dedicated `/viajes` screen as the app root | Standard "list of things" pattern. | |
| Trip list lives inside the Perfil tab | 4 tabs stay focused on the active trip; switching lives one tap deeper. | |

**User's choice:** Header-dropdown trip switching.

---

## Anonymous-join → upgrade flow

### First tap on /join/{token}

| Option | Description | Selected |
|--------|-------------|----------|
| Directly inside the trip — silent anonymous session, content visible immediately | Maximum frictionless. "Sin cuenta" pill indicates anonymous status. | ✓ |
| Welcome card: "Te invitó [Inviter] a [Trip Name]" + "Entrar" button | One friction beat. Creates social context. | |
| Ask for a display name first | Ensures every member has a name. One extra screen. | |

**User's choice:** Directly inside the trip.

### Upgrade prompt

| Option | Description | Selected |
|--------|-------------|----------|
| Contextual modal before risky actions (first upload, edit, etc.) | Just-in-time. Never blocks viewing. | |
| Persistent gentle banner across the app | Always-visible dismissible top banner. | ✓ |
| Tab badge + Perfil-tab CTA | Dot on Perfil tab + prominent card inside it. No interruptions. | |
| Hybrid: Perfil CTA always + modal before first upload | Best of both. | |

**User's choice:** Persistent gentle banner.

### Upgrade form contents

| Option | Description | Selected |
|--------|-------------|----------|
| Email only — nothing else | Minimum friction. | ✓ |
| Email + display name (if not set) | Fixes "Invitado #4" in the same step. | |
| Email + display name + avatar | Full profile in one shot. Higher friction. | |

**User's choice:** Email only.

---

## Profile & identity model

### Anonymous user display name default

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-generated friendly name — "Tucán Curioso", "Iguana Veloz" | Random adjective + animal. Memorable, fun, on-brand. | ✓ |
| "Invitado de [Inviter Name]" | Tied to inviter. Useful social context. | |
| Empty — force them to type a name before content | Contradicts the "first tap directly inside trip" decision. | |
| "Tú" for self, anonymous tag for others | Self-centric. Lowest empathy. | |

**User's choice:** Auto-generated friendly name (animal + adjective, Spanish-LATAM).

### Avatar default

| Option | Description | Selected |
|--------|-------------|----------|
| Colored circle with first letter of display name | Standard initial avatar. | |
| Colored circle with emoji matching the auto-name (🦜 🦎 🐢) | Fun + on-brand. Risk: cross-OS rendering. | ✓ |
| Solid colored circle, no glyph | Minimal. Hardest to distinguish 4+ members. | |

**User's choice:** Emoji avatar matching auto-name. Cross-OS rendering inconsistency accepted as the cost of the "fun + on-brand" benefit.

### Edit rights

| Option | Description | Selected |
|--------|-------------|----------|
| Only the user themselves edits their name | Standard expectation. | ✓ |
| Trip creator can also rename members in their trip | Useful for never-set-name anonymous members. | |
| Defer — only self-edit in Phase 1, revisit if confusion | Add creator-rename later if needed. | |

**User's choice:** Self-edit only. Creator-rename deferred to Phase 5 polish if real-trip testing reveals confusion.

---

## Claude's Discretion

- Exact RLS policy SQL per table (research will surface canonical patterns)
- Exact `is_trip_member(trip_id)` function body
- `es.ts` dictionary structure (flat vs. nested namespaces, typing pattern)
- GitHub Actions keep-alive cron implementation details (which endpoint, secret storage)
- The exact list of ~30 adjectives + ~30 animals for the auto-name generator
- Anonymous session storage validation on iOS Safari without Home Screen install
- Vercel env var naming and scope (server-only vs. public)

## Deferred Ideas

- Photo uploads for avatars — v2
- Light-mode toggle — Phase 5+
- Custom SVG brand mark — Phase 5 polish
- Creator-rename of members — Phase 5 polish if needed
- Dedicated `/viajes` route — only if header dropdown becomes unwieldy at 5+ trips
- Display-name + avatar collected during upgrade form — only if users never customize auto-names
