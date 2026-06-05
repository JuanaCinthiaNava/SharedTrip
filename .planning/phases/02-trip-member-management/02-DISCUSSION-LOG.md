# Phase 2: Trip + Member Management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-05
**Phase:** 02-trip-member-management
**Areas discussed:** Trip creation entry point, Invite-code sharing UX, Member list + remove/leave, Creator exit & trip lifecycle

---

## Trip creation entry point

### Where does a brand-new user (no trips) create their first trip?
| Option | Description | Selected |
|--------|-------------|----------|
| Welcome screen: code + 'Crear viaje' | Keep code entry primary, add secondary 'Crea un viaje' button below | |
| Two-choice welcome screen | Split into 'Ya me invitaron' vs 'Quiero crear un viaje' | ✓ |
| Creation stays in-app only | No new-user path; must be invited first | |

### Which fields are required to create a trip?
| Option | Description | Selected |
|--------|-------------|----------|
| Name only required | Name required; dates + description optional | ✓ |
| Name + dates required | Name and both dates required; description optional | |
| Name + start date required | Name + start date required; end + description optional | |

### Date input UX?
| Option | Description | Selected |
|--------|-------------|----------|
| Native date inputs | `<input type=date>`, zero deps, OS picker | |
| Custom range calendar | Styled range picker (react-day-picker / shadcn Calendar) | ✓ |

**Notes:** User wants polish on dates despite the extra build. Name-only-required keeps creation friction minimal (dates editable later via TRIP-08).

---

## Invite-code sharing UX

### Where does the invite code surface?
| Option | Description | Selected |
|--------|-------------|----------|
| Card at top of Gente tab | Pinned 'Invita a tu grupo' card above member list; doubles as empty state | ✓ |
| Header 'Invitar' action → sheet | Header button opens a share sheet | |
| Both: Gente card + header action | Most discoverable, more to maintain | |

### How does sharing work?
| Option | Description | Selected |
|--------|-------------|----------|
| Native share + copy fallback | navigator.share() + clipboard fallback | |
| Copy-to-clipboard only | Single 'Copiar' button + toast | ✓ |
| Add a QR code too | Native share + copy + QR of join URL | |

### What text gets shared?
| Option | Description | Selected |
|--------|-------------|----------|
| Friendly message + link + code | Prose + deep-link + bare code | ✓ |
| Link + code, no prose | URL + code only | |
| Bare code only | Just the code | |

**Notes:** Copy-only is simplest and works everywhere; the COPIED content is the full friendly message carrying both the `/join/[code]` deep-link and the typeable code, so it covers both Phase 1 entry paths.

---

## Member list + remove/leave

### What does each member row show?
| Option | Description | Selected |
|--------|-------------|----------|
| Avatar + name + role badge | Emoji avatar, name, 'Creador'/'Tú' badges | ✓ |
| Above + 'se unió' date | Adds join date per member | |
| Minimal: avatar + name | No badges | |

### How are remove + leave confirmed?
| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog confirmation | Confirm dialog for both (existing shadcn alert-dialog) | ✓ |
| Swipe-to-remove, no dialog | Swipe gesture, immediate | |
| Immediate + undo toast | Instant with 5s undo | |

### Where do the controls live?
| Option | Description | Selected |
|--------|-------------|----------|
| Inline on each Gente row | Creator's 'Quitar' on others; everyone's 'Salir' on own row | ✓ |
| Remove inline, leave in Perfil | Split across Gente and Perfil tabs | |

**Notes:** All membership management lives in one place (Gente). Removed/left members are naturally bounced by the existing RLS + layout null-trip redirect — no dedicated screen needed.

---

## Creator exit & trip lifecycle

### How should the creator's exit work? (TRIP-07)
| Option | Description | Selected |
|--------|-------------|----------|
| Delete-only in v1 (defer transfer) | Creator's only exit is delete; no 'Salir' | ✓ |
| Build ownership transfer | Promote a member to admin, then leave | |
| Block leave, show guidance | Disabled 'Salir' with tooltip | |

### TRIP-09: archive vs delete?
| Option | Description | Selected |
|--------|-------------|----------|
| Hard delete only | One 'Eliminar viaje'; ON DELETE CASCADE; no schema | ✓ |
| Archive + delete (soft) | archived_at column + archived view + delete | |
| Archive only | No hard delete in v1 | |

### Delete confirmation strength?
| Option | Description | Selected |
|--------|-------------|----------|
| Type trip name to confirm | Must type exact name (GitHub-style) | ✓ |
| Double AlertDialog | Red destructive button, no typing | |
| Single AlertDialog | One dialog, same as remove-member | |

**Notes:** Delete cascades to all future docs/itinerary, so it's the highest-stakes action → type-name-to-confirm. Ownership transfer and archiving deferred to keep the deadline.

---

## Claude's Discretion

- Server Action vs route handler for trip creation; reuse the `joinTripByCode` service-role bounded-mutation pattern (post-`signInAnonymously()` session-propagation constraint).
- Creator-as-admin membership insert: same action vs DB trigger (if trigger, SECURITY DEFINER + `SET search_path = public`).
- Exact `react-day-picker`/shadcn Calendar wiring.
- Realtime vs refetch for member-list/trip-edit propagation (flagged as open question).
- es.ts namespace structure for new `trip`/`members`/`invite` strings.
- Keep vs drop vestigial `invite_token` column (Phase 1 retained it).

## Deferred Ideas

- Ownership transfer (TRIP-07) → post-v1 / Phase 5.
- Trip archiving / soft-delete (TRIP-09) → v1 is hard-delete only.
- QR-code invites → copy-only in v1.
- Native share sheet → revisit after first real trip.
- Realtime member-list propagation → Phase 4 (Supabase Realtime).
