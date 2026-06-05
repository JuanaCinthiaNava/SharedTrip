# Phase 2: Trip + Member Management - Context

**Gathered:** 2026-06-05
**Status:** Ready for planning
**Mode:** mvp (vertical slices — ROADMAP `**Mode:** mvp`)

<domain>
## Phase Boundary

Phase 2 delivers the **trip container and its membership** — the structured object every later phase fills with content. By the end of this phase a user can: create a trip anonymously, see/share its hybrid invite code, view the member list, remove members (creator) or leave (member), edit the trip's name/dates/description, and delete a trip. This is the first phase where users **create and mutate their own data** (Phase 1 only entered an existing seed trip).

**In scope (TRIP-01..09, UI-05):**
- Create a trip: name (required), optional start/end dates, optional description; server-generates the hybrid `invite_code` on create (TRIP-01, TRIP-02)
- Creator + member of a created trip is inserted as a `trip_members` row with `role = 'admin'` (creator)
- Anonymous trip creation from a fresh device (mint anonymous session, then create) — parallels the Phase 1 join flow
- Invite-code display + sharing (TRIP-02) — surfaced in the Gente tab, copy-to-clipboard
- Trip list / switching (TRIP-04) — fills the existing trip-switcher sheet + wires the disabled "Crear nuevo viaje" entry
- Member list with avatars/names + role badges (TRIP-05)
- Creator removes members; members leave (TRIP-06, TRIP-07)
- Creator edits name/dates/description (TRIP-08)
- Creator deletes a trip (TRIP-09)
- All trip dates rendered via `Intl.DateTimeFormat('es-MX')` (UI-05)

**Out of scope (later phases or deferred):**
- Document upload/vault, PWA offline → Phase 3
- Itinerary + realtime → Phase 4
- **Ownership transfer** (creator hands admin to another member) → deferred (post-v1 / Phase 5 candidate)
- **Trip archiving / soft-delete** → deferred (v1 is hard-delete only)
- QR-code invites, native share sheet → deferred
- Email/account upgrade (AUTH-01/02/06) → Phase 6
- Photo avatars → v2

</domain>

<decisions>
## Implementation Decisions

### Trip creation entry & form (TRIP-01)
- **D-01:** Entry is a **two-choice welcome screen**. The current code-entry-only `/` welcome screen is split into two intents: **"Ya me invitaron"** (the existing invite-code entry / `InviteCodeForm`) and **"Quiero crear un viaje"** (new create path). This gives a brand-new user with zero trips a way to bootstrap their first trip — today they can ONLY join, because "Crear viaje" is buried in the in-trip switcher.
- **D-02:** Creating a trip from a fresh device **mints an anonymous session first** (same `signInAnonymously()` pattern as `joinTripByCode`), then opens the create form. A creator is anonymous-first, exactly like an invitee.
- **D-03:** Create-form fields: **name is the only required field.** Start date, end date, and description are all optional. Rationale: people create the trip before dates are locked; they edit later via TRIP-08. Empty dates simply hide the date display.
- **D-04:** Date entry uses a **custom range calendar** (recommend `react-day-picker` via the shadcn `Calendar` component in range mode), not native `<input type=date>`. Must support an explicit "sin fechas todavía" / clearable state since dates are optional. Validate `end >= start`.
- **D-05:** The disabled **"+ Crear nuevo viaje" button in `TripSwitcherSheet`** is wired to the same create flow (for users already inside a trip creating an additional one). Both this and the welcome-screen path lead to the same create form/action.

### Invite-code generation & sharing (TRIP-02)
- **D-06:** On trip create, the server **generates `invite_code`**: prefix = first ~4 letters of the trip name (uppercased, non-alpha stripped), `-`, then ~4 random chars from the **unambiguous alphabet** (exclude `0/O`, `1/I/L`). Retry suffix on unique-violation. This is the Phase 2 half of the `invite-code-schema` todo (the column + resolver + seed already shipped in Phase 1, migration `20260530000006_invite_code.sql`). Format must satisfy `CODE_RE` (`src/lib/utils/invite-code.ts`).
- **D-07:** The invite code surfaces as a **pinned "Invita a tu grupo" card at the top of the Gente tab**, above the member list. It doubles as the member-list empty state when you're the only member.
- **D-08:** Sharing is **copy-to-clipboard only** (no `navigator.share`, no QR in v1). A single "Copiar invitación" button + a "Copiado" toast.
- **D-09:** The copied text is a **friendly Spanish message containing both the deep-link and the bare code**, e.g. `Únete a mi viaje "{nombre}" en SharedTrip 🌴  {url}/join/{code}  (o escribe el código {code})`. Covers both Phase 1 entry paths (deep-link route `/join/[code]` AND typed code on the welcome screen).

### Member list & roles (TRIP-05, TRIP-06, TRIP-07)
- **D-10:** Each member row shows the **Phase 1 emoji+color avatar, the display name, and a role badge**: `Creador` on the trip owner, `Tú` on the current user. No join dates (noise for a friend group). Reuses `UserAvatar` + `profiles.display_name`/`avatar_seed`.
- **D-11:** **Destructive actions use an `AlertDialog` confirmation** (the shadcn `alert-dialog` component already exists). Remove: "¿Quitar a {nombre} del viaje?"; Leave: "¿Salir de {viaje}?" — both with a destructive-styled confirm button.
- **D-12:** Controls are **inline on each Gente row**. The creator sees a "Quitar" action on every OTHER member's row; every non-creator member sees a "Salir del viaje" action on their own row. Backed by the existing `trip_members` DELETE RLS policy ("admin can remove members; any member can leave themselves").
- **D-13:** A **removed/left member is naturally bounced**: RLS denies their trip SELECT, so the existing `t/[tripId]/layout.tsx` null-trip guard redirects them to `/` on next navigation. No dedicated "ya no eres parte" screen in v1.

### Trip edit & lifecycle (TRIP-08, TRIP-09)
- **D-14:** Trip edit (name/dates/description, creator-only per the `trips` UPDATE RLS policy) **reuses the create form** pre-filled. Surface from the trip header or trip settings (planner's call on exact placement).
- **D-15:** **Creator exit = delete-only in v1.** The creator has no "Salir" action; their only exit is to delete the whole trip. Ownership transfer is deferred. This satisfies TRIP-07's "transfer OR delete" by providing delete.
- **D-16:** **Hard delete only — no archive.** TRIP-09's "archivar/eliminar" is implemented as a single "Eliminar viaje". `ON DELETE CASCADE` (already in the schema) wipes members/docs/itinerary. No `archived_at` column in v1.
- **D-17:** **Delete requires typing the exact trip name** to enable the destructive confirm button (GitHub-style), inside an `AlertDialog`. Justified by the irreversible cascade. Reuses existing form/input + alert-dialog components.

### Date formatting (UI-05)
- **D-18:** All trip dates render via **`Intl.DateTimeFormat('es-MX')`** consistently across views (trip header, trip list/switcher, member/trip cards). Establish a shared date-format helper so every later phase inherits one source of truth. Range display when both dates present (e.g. "5 jun – 12 jun 2026"); single/empty gracefully handled.

### Claude's Discretion
- Whether trip creation runs through a **Server Action vs route handler**. Note the live constraint from Phase 1 (`src/actions/members.ts`): immediately after `signInAnonymously()` the new session lives only on the response cookie, so an RLS-gated insert with `WITH CHECK (... = auth.uid())` fails on the same request. The creator's `trips` INSERT (`created_by = auth.uid()`) **and** the self `trip_members` admin insert hit this exact issue — reuse the **service-role bounded-mutation pattern** from `joinTripByCode` (userId taken from the server-side session, never client input). Planner picks the precise shape.
- Whether the creator's `trip_members` row is inserted in the same action as the trip, or via a DB trigger. (A trigger on `trips` INSERT inserting the creator as admin is a clean option — planner decides; if a trigger, it must be `SECURITY DEFINER` with `SET search_path = public` per the established pattern.)
- Exact `react-day-picker` / shadcn `Calendar` wiring and whether to add it via `npx shadcn add calendar`.
- Realtime vs refetch for member-list / trip-edit propagation. ROADMAP Success Criterion 4 says edits reflect "instantly for all members." Supabase Realtime arrives formally in Phase 4 (ITIN-04); for Phase 2, refetch-on-focus / router refresh is acceptable if realtime is not yet wired — planner decides based on cost. **Flag this as an open question for the planner/researcher** (see Open Questions).
- Exact es.ts namespace structure for the new `trip`, `members`, `invite` strings (follow the existing `as const` typed-dictionary pattern).
- Whether to keep or drop the vestigial `invite_token` column — Phase 1 deliberately retained it; no need to touch it.

### Folded Todos
- **`invite-code-schema.md`** (`.planning/todos/pending/invite-code-schema.md`, matched score 0.6) — **folded.** The Phase 1 half (add `invite_code` column, `get_trip_id_by_invite_code` resolver, typeable seed code) already shipped (migration `…000006_invite_code.sql`). The remaining **Phase 2 task — "generate `invite_code` server-side on trip create: prefix from name, random unambiguous suffix, retry on unique-violation"** — is captured as **D-06** above. Move this todo to done once D-06 ships.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level decisions (always read)
- `.planning/PROJECT.md` — Core value, constraints, what NOT to build
- `.planning/REQUIREMENTS.md` — TRIP-01..09 + UI-05 full text (this phase's scope)
- `.planning/ROADMAP.md` — Phase 2 section: goal, 5 success criteria, `**Mode:** mvp`, depends on Phase 1
- `CLAUDE.md` — Locked stack (Next.js 16, Supabase, Tailwind v4, shadcn/ui v4), version matrix, "What NOT to Use"
- `.planning/phases/01-foundation-auth/01-CONTEXT.md` — Carried-forward Phase 1 decisions (identity D-14/15, palette D-05, nav D-06, switcher D-09)

### Invite-code decision lineage
- `.planning/notes/entry-model-invite-code.md` — the entry-model pivot (magic-link → typed code) rationale
- `.planning/todos/pending/invite-code-schema.md` — hybrid `invite_code` schema + the Phase 2 generation task (folded as D-06)

### Existing code to read before planning (Phase 1 patterns this phase extends)
- `supabase/migrations/20260530000001_initial_schema.sql` — `trips`, `trip_members`, `profiles` tables; `is_trip_member()`; all RLS policies (creator update/delete, member join, admin-remove/self-leave)
- `supabase/migrations/20260530000006_invite_code.sql` — `invite_code` column + `get_trip_id_by_invite_code(text)` resolver + the SECURITY DEFINER pattern to mirror
- `src/actions/members.ts` — `joinTripByCode`: the anonymous-session + **service-role bounded-mutation** pattern trip creation must reuse (see D-02 + Discretion)
- `src/lib/utils/invite-code.ts` — `CODE_RE`, `normalizeInviteCode`, `isWellFormedInviteCode` (the generator must produce codes that pass `CODE_RE`)
- `src/components/layout/TripSwitcherSheet.tsx` — the disabled "+ Crear nuevo viaje" button to wire (D-05); trip-list rendering
- `src/app/t/[tripId]/layout.tsx` — trip shell: auth/RLS guards, loads trip + sibling trips + profile; the null-trip redirect that powers D-13
- `src/app/t/[tripId]/gente/page.tsx` — the empty-state placeholder to replace with the member list + invite card
- `src/components/profile/UserAvatar.tsx`, `src/lib/utils/avatar.ts` — avatar reuse for member rows (D-10)
- `src/components/ui/alert-dialog.tsx`, `form.tsx`, `input.tsx`, `sheet.tsx` — existing shadcn primitives for confirms (D-11/D-17), the create/edit form (D-03/D-14)
- `src/i18n/es.ts` — typed Spanish dictionary; ALL new strings go here (no hardcoded JSX text)
- `src/types/database.ts` — regenerate/extend after any schema change (invite_code already present)

### External documentation (cite when implementing)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — `is_trip_member` + `(SELECT auth.uid())` performance pattern
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — anonymous create flow (D-02)
- [react-day-picker](https://daypicker.dev/) + [shadcn Calendar](https://ui.shadcn.com/docs/components/calendar) — range date picker (D-04)
- [MDN clipboard `writeText`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — copy invitation (D-08)
- [`Intl.DateTimeFormat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) — `es-MX` formatting (D-18)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`joinTripByCode` (`src/actions/members.ts`)** — the canonical anonymous-session + service-role bounded-mutation pattern. Trip creation has the SAME in-request session-propagation constraint (D-02 + Discretion).
- **`invite-code.ts` utils** — `CODE_RE` / `normalizeInviteCode` define the format the new generator must satisfy.
- **`UserAvatar` + `avatar.ts`** — emoji/color avatar for member rows (D-10), already deterministic from user id.
- **shadcn primitives present:** `alert-dialog`, `form`, `input`, `sheet`, `button`, `skeleton`, `sonner` (toasts). `calendar` is NOT yet installed (D-04 needs it).
- **`TripSwitcherSheet`** — trip list + the disabled create button to wire; **`EmptyState`** — for the invite card / empty member list.
- **`es.ts`** — typed dictionary; extend with `trip`/`members`/`invite` namespaces.

### Established Patterns
- **RLS-in-creation-migration** — any new column/table/function in the same migration, RLS enabled there. New SECURITY DEFINER functions use `SET search_path = public`.
- **`(SELECT auth.uid())`** wrapping in every policy (perf pattern, already pervasive).
- **Service-role for post-`signInAnonymously()` inserts** — never trust client input for `user_id`/`created_by`; take from server session.
- **All UI strings via `es.ts`; all colors via `@theme` tokens** — zero hardcoded Spanish/hex in components.
- **Trip-scoped routes** `/t/[tripId]/{docs,itin,gente,perfil}` under the auth-guarded layout.

### Integration Points
- Schema already supports everything EXCEPT `invite_code` generation-on-create (D-06) and the creator-as-admin membership insert on create. No `archived_at` needed (D-16 = hard delete).
- The `trips` UPDATE/DELETE RLS policies are creator-only — TRIP-08/09 are already authorized by them.
- The `trip_members` DELETE policy already authorizes both creator-removes-member and member-leaves — TRIP-06/07 need only the UI + actions (D-12).
- Phase 3 (docs) and Phase 4 (itinerary) will create rows against these trips; the `es-MX` date helper (D-18) becomes the shared formatter they inherit.

</code_context>

<specifics>
## Specific Ideas

- The two-choice welcome screen (D-01) keeps "Ya me invitaron" as the visually primary path (join is the common case for a friend group) while making "crear" reachable — needed so the project owner can bootstrap the first real trip from a fresh device without seeding.
- The shared invitation text (D-09) intentionally carries BOTH the deep-link and the typeable code so it works whether the recipient taps in WhatsApp or types on the welcome screen — matching the dual entry paths Phase 1 built.
- Type-name-to-delete (D-17) was chosen deliberately over a lighter confirm because delete cascades to all future docs/itinerary — the highest-stakes action in the app.

</specifics>

<deferred>
## Deferred Ideas

- **Ownership transfer** (creator promotes a member to admin, then leaves) — deferred from TRIP-07; v1 is delete-only (D-15). Post-v1 / Phase 5 candidate.
- **Trip archiving / soft-delete** (`archived_at`, archived-trips view, recovery) — deferred from TRIP-09; v1 is hard-delete only (D-16).
- **QR-code invites** (scan-to-join via `/join/[code]`) — deferred; copy-to-clipboard only in v1 (D-08).
- **Native share sheet (`navigator.share`)** — deferred; revisit if copy-paste proves clunky on the first real trip.
- **Realtime member-list / trip-edit propagation** — Supabase Realtime formally arrives in Phase 4; Phase 2 may ship refetch-on-focus instead (see Open Questions / Discretion).

</deferred>

<open_questions>
## Open Questions for Research/Planning

- **"Instantly for all members" (ROADMAP Success Criterion 4):** does trip-edit / member-list freshness require Supabase Realtime in Phase 2, or is router-refresh / refetch-on-focus acceptable until Realtime lands in Phase 4? Researcher should weigh cost vs the literal success criterion. Lean: refetch is fine for v1 if Realtime adds material complexity.
- **Creator-as-admin insert mechanism:** Server Action (service-role) vs DB trigger on `trips` INSERT. Researcher/planner pick; if trigger, must be `SECURITY DEFINER` + `SET search_path = public`.

</open_questions>

---

*Phase: 02-trip-member-management*
*Context gathered: 2026-06-05*
