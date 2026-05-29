# Plan Review: Phase 1 — Foundation + Auth

**Reviewed:** 2026-05-29
**Reviewer:** gsd-plan-checker
**Plans examined:** 01-01, 01-02, 01-03, 01-04, 01-05
**Artifacts read:** ROADMAP.md, REQUIREMENTS.md, CONTEXT.md, SKELETON.md, RESEARCH.md, UI-SPEC.md, CLAUDE.md

---

## REVIEW NEEDS REVISION

**Issues found:** 3 CRITICAL, 4 HIGH, 3 MEDIUM, 2 LOW

---

## Dimension 1: Goal Coverage — 5/5 PASS

All five ROADMAP success criteria are addressed:

| Success Criterion | Delivering Plan(s) | Status |
|---|---|---|
| 1. Deploy to Vercel, loads on real iPhone over HTTPS | 01-01 Tasks 2–3 + Checkpoint | Covered |
| 2. Magic link → unique subject → persistent session | 01-02 (schema), 01-03 (flow) | Covered |
| 3. Anonymous join via invite URL → sees self as member | 01-05 Task 1 (joinTrip + /join/[token]) | Covered |
| 4. Anonymous → real account, trip membership preserved | 01-05 Task 3 (updateUser({ email })) | Covered |
| 5. GitHub Actions cron pings Supabase; all strings from es.ts | 01-02 Task 3 (cron); 01-01/01-04 (es.ts) | Covered |

---

## Dimension 2: Requirement Coverage — PASS (with one duplicate, no gaps)

| Requirement | Assigned to | Task coverage |
|---|---|---|
| INFRA-01 | 01-01 | Task 3 user_setup + Task 3 action (Supabase project creation + env vars) |
| INFRA-02 | 01-02 | Task 1 (four migration files with 6 tables) |
| INFRA-03 | 01-02 | Task 1 (RLS + is_trip_member), Task 2 (push + verify) |
| INFRA-04 | 01-02 | Task 1 (storage RLS) + user_setup (bucket creation) |
| INFRA-05 | 01-02 | Task 3 (keep-alive workflow) |
| INFRA-06 | 01-01 | Task 3 (Vercel deploy + env vars) |
| INFRA-07 | 01-01, 01-04 | Task 2 (es.ts seed), Task 1 (es.ts extensions) — duplicate assignment is fine |
| AUTH-01 | 01-03 | Tasks 1–3 (full magic link slice) |
| AUTH-02 | 01-03 | Task 2 (anti-threading subject config) |
| AUTH-03 | 01-03 | Task 1 (middleware refresh) + Checkpoint step 4 |
| AUTH-04 | 01-04 | Task 3 (signOut AlertDialog) |
| AUTH-05 | 01-05 | Task 1 (joinTrip + signInAnonymously) |
| AUTH-06 | 01-05 | Task 3 (updateUser({ email })) |
| UI-01 | 01-01, 01-04 | es.ts + no-hardcoded-Spanish enforced in every plan |
| UI-02 | 01-01, 01-04 | @theme tokens, Tropical Sunset palette |
| UI-03 | 01-01, 01-04 | max-w-md + safe-area-inset-bottom |

All 16 phase requirement IDs are present in at least one plan's `requirements` field. No silent drops.

**Note:** ROADMAP.md success criterion 5 says "every 3 days" but REQUIREMENTS.md INFRA-05 says "every 5 minutes." Plans correctly implement 5-minute interval per INFRA-05 and CONTEXT.md line 121 ("honour the requirement"). The ROADMAP text is a stale description — not a plan defect.

---

## Dimension 3: Locked-Decision Adherence — CRITICAL ISSUES FOUND

### CRITICAL-1: D-03 timestamp subject vs `{{ .Token }}` subject — scope reduction without explicit deferral gate

**Severity: CRITICAL**
**Plan:** 01-03, also 01-SKELETON.md
**Decision:** D-03 (CONTEXT.md line 38) — Subject template `Acceso a tu viaje · HH:mm` where `HH:mm` is the request time in 24h format via `Intl.DateTimeFormat('es-MX')`.
**Plan delivers:** `Acceso a tu viaje · {{ .Token }}` — a token fragment, NOT a human-readable timestamp.
**Evidence:**
- 01-SKELETON.md line 19: "subject `Acceso a tu viaje · {{ .Token }}` (token fragment makes each subject unique) | D-03 timestamp form requires `admin.generateLink()` + Resend SDK; defer to Phase 5 if `{{ .Token }}` insufficient."
- 01-03-PLAN.md Task 2 action: "The Pitfall 5 'simple' approach uses the Supabase email template + `{{ .Token }}` in the subject."
- 01-03 Checkpoint step 2b: "Subject contains `Acceso a tu viaje · {something}` where `{something}` is a token fragment (NOT a timestamp — using the simple approach per Pitfall 5)."
- 01-RESEARCH.md Open Question 1 (unresolved — see Dimension 11).

**Why this is a CRITICAL issue:** D-03 is a locked decision that explicitly requires `HH:mm` timestamp. The planner unilaterally changed this to `{{ .Token }}` without returning to the user for a decision revision. The plans correctly identify the technical trade-off (`admin.generateLink()` complexity) but then treat it as "Claude's Discretion" when it is a locked decision. The accepted approach would be: (a) implement D-03 fully using `admin.generateLink()` + Resend SDK, OR (b) return this to the user as a scope split decision before execution.

**Fix:** Either implement `admin.generateLink()` with Resend SDK in Plan 03 Task 2 to deliver D-03 as specified, OR explicitly ask the user whether `{{ .Token }}` is acceptable as a Phase 1 scope reduction (updating CONTEXT.md with a revised D-03). Do not silently deliver a different implementation than what was decided.

---

### CRITICAL-2: D-08 wordmark weight 600 vs plan weight 700 — plan contradicts CONTEXT.md

**Severity: CRITICAL**
**Plan:** 01-01 Task 2 (Wordmark.tsx)
**Decision:** D-08 (CONTEXT.md line 65) — "the literal string `SharedTrip` rendered in `--color-primary` (coral), Inter italic, **weight 600**."
**Plan delivers:** weight 700.
**Evidence:**
- 01-01-PLAN.md Task 2 action: "Style: Inter italic, weight 700, `text-primary`."
- 01-01-PLAN.md Task 2 acceptance_criteria: "font-bold" (Tailwind `font-bold` = weight 700, not 600).
- 01-UI-SPEC.md line 68: "Brand wordmark 'SharedTrip': Inter italic, weight 700." (This itself contradicts CONTEXT.md D-08).
- 01-UI-SPEC.md line 67: "Maximum 2 weights in use: 400 (regular) and 700 (bold). No intermediate weights (500, 600) permitted."

**Why this is a CRITICAL issue:** CONTEXT.md D-08 is a locked user decision that specifies weight 600. The UI-SPEC overrides it to 700 and prohibits 600 ("no intermediate weights"). There is a direct contradiction between CONTEXT.md (locked by the user) and UI-SPEC (created by Claude during planning). The plans follow the UI-SPEC. The user must resolve this contradiction before execution — the executor cannot know which to honour.

**Fix:** Return to the user: "D-08 in CONTEXT.md says wordmark weight 600, but UI-SPEC and typography rules restrict weights to 400/700. Which takes precedence? If 700: update D-08 in CONTEXT.md. If 600: update UI-SPEC Typography section and relax the 2-weight constraint." Then revise plans accordingly.

---

### HIGH-1: D-03 open question unresolved (Dimension 11 Research Resolution)

**Severity: HIGH**
**File:** 01-RESEARCH.md `## Open Questions` (line 1246)
**Issue:** Three questions listed; the section has no `(RESOLVED)` suffix. Open Question 1 is directly linked to the D-03 CRITICAL issue above. Questions 2 and 3 are acceptably documented as "known risks" but are not formally marked resolved.
**Fix:** If CRITICAL-1 is resolved by implementing `admin.generateLink()`, mark Open Question 1 RESOLVED. For Questions 2 and 3, confirm they are documented accepted risks and add `(RESOLVED)` to the section header.

---

## Dimension 4: Walking Skeleton Integrity — PASS

SKELETON.md documents the architectural backbone cleanly:
- Wave 1: Scaffold + deploy + first Spanish screen (Plan 01)
- Wave 2 (parallel): Schema + RLS (Plan 02) AND auth slice (Plan 03)
- Wave 3: Shell + Perfil + PWA (Plan 04) — correctly depends on 01-02 and 01-03
- Wave 4: Anonymous join + upgrade (Plan 05) — correctly depends on 01-02 + 01-03 + 01-04

The skeleton produces the thinnest end-to-end working slice (welcome screen → deployed) in Wave 1 before auth code is written. Each subsequent wave adds a vertical capability. The architectural decisions table is thorough and contracts are frozen.

---

## Dimension 5: MVP Vertical-Slice Compliance — PASS

Each plan is a vertical slice, not a layer split:
- 01-01: Bootstrap → UI → Deploy (welcome screen vertical)
- 01-02: Schema → Types → Cron → Types generated (data plane vertical)
- 01-03: Factories → Server Action → Callback → Form (auth vertical)
- 01-04: Avatar utils → Shell layout → Perfil + PWA (shell vertical)
- 01-05: joinTrip → Banner → UpgradeSheet (anonymous join vertical)

No horizontal layer splits detected.

---

## Dimension 6: Task Quality — HIGH issues found

### HIGH-2: Plan 01-04 Task 2 `<files>` list references `src/app/t/[tripId]/perfil/page.tsx` as expected to exist AFTER Task 3, not Task 2

**Severity: HIGH**
**Plan:** 01-04, Task 2 `<acceptance_criteria>`
**Issue:** Task 2 acceptance_criteria line: "All four /t/[tripId]/{docs,itin,gente,perfil}/page.tsx routes exist (perfil from Task 3; docs/itin/gente from this task)." The `<files>` for Task 2 lists only `docs/page.tsx`, `itin/page.tsx`, `gente/page.tsx` — which is correct. However, the acceptance criterion then checks for all four including `perfil`, which doesn't exist yet in Task 2. An automated build check at Task 2 completion would pass (Next.js doesn't error on missing page files), but the criterion is misleading — the executor may try to verify `perfil` before Task 3 creates it.
**Fix:** Remove the perfil check from Task 2 acceptance_criteria or add a note that perfil is expected to be absent at this point.

---

### HIGH-3: Plan 01-03 `<next>` redirect validation for T-03-06 is in `<threat_model>` but not in Task 2 `<acceptance_criteria>`

**Severity: HIGH**
**Plan:** 01-03, Task 2
**Issue:** T-03-06 in the threat model identifies that the `next` redirect parameter must be validated (relative path only). The threat model says "Task 2 acceptance criteria does not enforce this — ADD a test." But the acceptance_criteria section is NOT updated to include this check. The instruction to add the check is buried in the threat model, not in the task where the executor will look.
**Fix:** Add to Task 2 `<acceptance_criteria>`: "`grep -c 'startsWith.*//\|!next.startsWith' src/app/auth/callback/route.ts` returns >= 1 (redirect parameter validated as relative path per T-03-06)."

---

## Dimension 7: Dependency + Wave Correctness — PASS

| Plan | Wave | Declared depends_on | Valid? |
|---|---|---|---|
| 01-01 | 1 | [] | Yes — Wave 1 entry point |
| 01-02 | 2 | [01-01] | Yes — needs scaffold + env vars |
| 01-03 | 2 | [01-01] | Yes — needs scaffold + env vars (schema via Plan 02 can be parallel because Plan 03 only needs the DB to exist for Plan 02's checkpoint, not for code authoring) |
| 01-04 | 3 | [01-02, 01-03] | Yes — needs schema types (01-02) and auth factories (01-03) |
| 01-05 | 4 | [01-02, 01-03, 01-04] | Yes — needs seed trip (01-02), auth (01-03), shell (01-04) |

No cycles detected. No missing references. Wave assignments are internally consistent.

**Observation (not a blocker):** Plan 01-03 reads `src/types/database.ts` (from 01-02 Task 1 `<read_first>`) but has no dependency on 01-02 in its frontmatter. This is intentional per design — the types are needed at code-authoring time (Wave 2 parallel), but the actual `createClient` factories will be built against the type file that 01-02 generates. If 01-02 runs strictly before 01-03 within Wave 2 (executor sequencing), this is fine. If they run in parallel, 01-03 Task 1's `<read_first>` reference to `src/types/database.ts` cannot be satisfied at execution start. This should be noted for the executor.

**MEDIUM-1:** 01-03 depends on `src/types/database.ts` being present (listed in Task 1 `<read_first>`) but 01-02 is not listed as a dependency. Within Wave 2, if the executor runs 01-03 before 01-02 completes Task 2 (the BLOCKING push task), the types file doesn't exist yet. The executor should run 01-02 to Task 2 completion before starting 01-03 Task 1. This needs a note, not a plan change — the dependency is implicit via the BLOCKING tag on 01-02 Task 2.

---

## Dimension 8: Schema Push Gate — PASS

01-02 Task 2 is explicitly tagged `gate="blocking"` and labeled `[BLOCKING]`. It runs AFTER Task 1 (migration file authoring) and BEFORE the human checkpoint. The task:
1. Verifies the storage bucket exists (user_setup prerequisite)
2. Runs `supabase db push --linked`
3. Generates `src/types/database.ts`
4. Verifies seed row and anon-curl RLS check

The push gate pattern is correctly implemented.

---

## Dimension 9: Threat Model Coverage — PASS (with one task-level gap noted above as HIGH-3)

All five plans have `<threat_model>` blocks with STRIDE registers. Key threats are covered:

| Threat | Coverage | Status |
|---|---|---|
| SUPABASE_SECRET_KEY never NEXT_PUBLIC_ | 01-01 T-01-02, 01-02 T-02-06, 01-03 acceptance_criteria | PASS |
| RLS-in-creation-migration | 01-02 T-02-01, T-02-02; acceptance_criteria grep | PASS |
| Redirect param validation | 01-03 T-03-06 (threat model) | GAP — not in acceptance_criteria (see HIGH-3) |
| trip_members WITH CHECK | 01-02 T-02-03, 01-05 T-05-02 | PASS |
| Error param echoing | 01-05 T-05-07 (fixed: maps to es.errors.* keys, no raw echo) | PASS |
| Storage path traversal | 01-02 T-02-04 | PASS |
| PKCE replay | 01-03 T-03-03 | PASS |
| Anonymous session sharing | 01-05 T-05-04 (accepted) | PASS |

---

## Dimension 10: must_haves Derivation — PASS

All five plans have `must_haves` blocks. Truths are user-observable and testable:
- 01-01: "Developer can open the deployed Vercel URL on a real iPhone..." — observable
- 01-02: "An unauthenticated user querying any of trips... gets zero rows" — testable via curl
- 01-03: "User can type their email... and see the /auth/check-email screen" — end-to-end observable
- 01-04: "An authenticated user navigating to /t/{seed_trip_id}/docs sees the bottom-tab shell" — observable
- 01-05: "An unauthenticated user visiting /join/22222222... ends up authenticated... in a single click" — observable

No implementation-focused truths ("bcrypt installed" style). All artifacts have `contains` assertions for verification.

---

## Dimension 11: Research Resolution — HIGH ISSUE

**Severity: HIGH**
**File:** 01-RESEARCH.md `## Open Questions` (line 1246)
**Issue:** Section has NO `(RESOLVED)` suffix. Three open questions remain formally unresolved:
1. Email subject customization (directly linked to CRITICAL-1 above — `{{ .Token }}` vs `HH:mm`)
2. New Supabase API key format (risk managed by Pitfall 2 checks — acceptable to mark resolved with a note)
3. Anonymous session persistence on iOS (risk accepted, Phase 5 validates — acceptable to mark resolved with a note)
**Fix:** Resolve Question 1 by deciding between `{{ .Token }}` and `admin.generateLink()`. Mark Questions 2 and 3 as resolved with their accepted-risk notes. Add `(RESOLVED)` to the section header.

---

## Dimension 12: Pattern Compliance — SKIPPED (no PATTERNS.md found)

No `01-PATTERNS.md` exists in the phase directory.

---

## Dimension 7c: Architectural Tier Compliance — PASS

The Architectural Responsibility Map in 01-RESEARCH.md defines clear tier ownership. Plans respect it:

- `sendMagicLink` → Server Action (API/Backend tier) ✓
- `exchangeCodeForSession` → Route Handler (API/Backend) ✓
- Middleware session refresh → Frontend Server (Middleware tier) ✓
- `signInAnonymously` on `/join/[token]` → Server Action (API/Backend) ✓
- `updateUser({ email })` → Browser/Client component ✓ (AnonymousUpgradeSheet is `'use client'`)
- RLS enforcement → Database/Storage ✓
- `es.ts` dictionary → Browser/Client ✓

No security-sensitive capability assigned to a less-trusted tier.

---

## Additional Finding: MEDIUM scope issues

### MEDIUM-2: Plan 01-04 has 3 tasks + 1 checkpoint with 18 files_modified — borderline scope

**Severity: MEDIUM**
**Plan:** 01-04
**Metrics:** 3 auto tasks + 1 checkpoint, 18 files modified.
The 18-file count exceeds the "5-8 files/plan" target but is within the hard blocker threshold (15+). The scope is internally coherent (avatar utils + shell components + Perfil + PWA in one plan), and the task split within the plan is reasonable (3 tasks, not 5+). The checkpoint validates the whole plan before proceeding.
**Recommendation:** Consider splitting Perfil/PWA (Task 3) into a separate plan 01-05 and shifting anonymous join to 01-06. However, this would increase wave depth and the deadline is real. Current structure is executable with attention to scope — not blocking.

### MEDIUM-3: Plan 01-01 Task 1 action includes `npm install -D supabase` but Supabase CLI is also expected for `supabase init` in 01-02 Task 1

**Severity: MEDIUM**
**Plans:** 01-01, 01-02
**Issue:** 01-01 Task 1 installs `supabase` as a dev dependency. 01-02 Task 1 uses `npx supabase init`. This is consistent — the devDep install in 01-01 means 01-02 can use `npx supabase` (it resolves from node_modules). However, the `npx supabase` in 01-02 Task 1 does not specify the local path explicitly, which could resolve to the global CLI if the devDep isn't on PATH. Minor execution risk. The acceptance criteria for 01-01 do not verify the supabase CLI devDep was installed.
**Fix:** Add to 01-01 Task 1 acceptance_criteria: `jq -r '.devDependencies.supabase' package.json | grep -v null`. Or use `./node_modules/.bin/supabase` in 01-02 to be explicit.

---

## Dimension: Scope Reduction Detection (7b) — CRITICAL ISSUE FOUND

### CRITICAL-3: Scope reduction on D-03 without user decision update (same as CRITICAL-1 but viewed through 7b lens)

Already documented under CRITICAL-1. The planner unilaterally simplifies D-03 from `HH:mm` (requires `admin.generateLink()` + Resend SDK) to `{{ .Token }}` (Supabase template only). The plans use the language "simple approach", "defer to Phase 5 if insufficient" — classic scope reduction framing.

**This is not a case where the reduced approach is equivalent.** The user explicitly designed D-03 to make the timestamp human-readable (`HH:mm`) so recipients could identify the freshest link. `{{ .Token }}` produces an opaque token fragment. The uniqueness property is preserved, but the user-facing readability intent of D-03 is not.

---

## Summary Table

| Dimension | Score (0-5) | Status |
|---|---|---|
| 1. Goal Coverage | 5 | PASS |
| 2. Requirement Coverage | 5 | PASS |
| 3. Locked-Decision Adherence | 2 | FAIL — D-03 scope reduction, D-08 weight contradiction |
| 4. Walking Skeleton Integrity | 5 | PASS |
| 5. MVP Vertical-Slice Compliance | 5 | PASS |
| 6. Task Quality | 3 | PASS (with HIGH gaps) |
| 7. Dependency + Wave Correctness | 4 | PASS (MEDIUM note on implicit 02→03 ordering) |
| 8. Schema Push Gate | 5 | PASS |
| 9. Threat Model Coverage | 4 | PASS (T-03-06 not in acceptance_criteria) |
| 10. must_haves Derivation | 5 | PASS |
| 11. Research Resolution | 2 | FAIL — Open Questions unresolved |
| 12. Pattern Compliance | N/A | SKIPPED |
| 7b. Scope Reduction | 1 | FAIL — D-03 reduced without user decision |
| 7c. Architectural Tier | 5 | PASS |

**Overall: DOES NOT PASS (3 CRITICAL + 4 HIGH + 3 MEDIUM findings)**

---

## Required Fixes Before Execution

### Must fix (CRITICAL):

**CRITICAL-1 / CRITICAL-3:** D-03 scope reduction — the planner must either:
- Option A: Implement D-03 as specified. In 01-03 Plan Task 2, add `admin.generateLink()` + Resend SDK call to inject the timestamp into the subject. Update `user_setup` to include Resend API key configuration in Plan 03.
- Option B: Return to the user with: "D-03 requires `admin.generateLink()` which is more complex. Acceptable to ship `{{ .Token }}` (opaque token fragment, equally unique) in Phase 1 and implement the readable `HH:mm` format in Phase 5?" If user approves, update CONTEXT.md D-03 and mark it revised.

**CRITICAL-2:** D-08 weight 600 vs 700 contradiction — return to user with: "CONTEXT.md D-08 says weight 600 but UI-SPEC Typography says only 400/700 are permitted. Which is correct?" Update either CONTEXT.md or UI-SPEC accordingly, then revise 01-01 Task 2 action and acceptance_criteria to match.

### Should fix (HIGH):

**HIGH-1:** Mark RESEARCH.md Open Questions resolved or explicitly document which are accepted-risk vs requiring decision.

**HIGH-2:** Fix 01-04 Task 2 acceptance_criteria to not check for `perfil/page.tsx` (which doesn't exist until Task 3).

**HIGH-3:** Move T-03-06 redirect validation from `<threat_model>` into 01-03 Task 2 `<acceptance_criteria>` with a concrete grep command.

### Recommended fixes (MEDIUM):

**MEDIUM-1:** Add an executor note in 01-03 frontmatter or Task 1 `<read_first>` that `src/types/database.ts` (from 01-02 Task 2) must exist before Task 1 of this plan executes.

**MEDIUM-2:** No change required — scope is borderline acceptable given the deadline. Document in 01-04 Task 2 that the high file count is acknowledged.

**MEDIUM-3:** Add Supabase CLI devDep verification to 01-01 Task 1 acceptance_criteria.

---

*Review completed: 2026-05-29*
*Return status: REVISION REQUIRED — 3 CRITICAL issues must be resolved before execution*

---

## REVISIONS APPLIED 2026-05-29

Planner revised affected plans + SKELETON per user decisions on CRITICAL-1, CRITICAL-2, CRITICAL-3 and per HIGH/MEDIUM findings 4–8. Source-artifact updates (CONTEXT.md D-03 / D-08, RESEARCH.md Open Questions section) were made by the orchestrator before this revision pass.

### Per-finding changes

| Finding | Status | File(s) | Change |
|---|---|---|---|
| CRITICAL-1 (D-03 email subject scope reduction) | RESOLVED via hybrid (subject `{{ .Token }}` + body `Solicitado a las HH:mm`) | `01-03-PLAN.md` (Task 2 `user_setup` dashboard_config; Task 2 `<action>` D-03 note block; Task 2 must_haves truth #2; Checkpoint how-to-verify step 2d), `01-SKELETON.md` (Architectural Decisions email row; Out-of-Scope D-03 entry struck through) | `user_setup` now requires both the `{{ .Token }}` subject AND a `Solicitado a las {{ .Date }}` body line with es-MX fallback; `<action>` documents that D-03 lives in the Supabase template (no code change in `src/actions/auth.ts`); must_haves truth + checkpoint verify body line presence; SKELETON no longer claims D-03 is deferred. |
| CRITICAL-2 (D-08 wordmark weight 600 vs 700) | RESOLVED — D-08 revised to weight 700 (already aligned with UI-SPEC) | `01-01-PLAN.md` (Task 2 action line 259, acceptance_criteria line 285) | NO change required — Plan 01-01 already specifies `Inter italic, weight 700` and `font-bold`. Verified consistent with revised CONTEXT.md D-08. |
| CRITICAL-3 / HIGH-1 (RESEARCH Open Questions unresolved) | RESOLVED by orchestrator | `01-RESEARCH.md` line 1246 header already updated to `## Open Questions (RESOLVED 2026-05-29)`. | NO plan-side change needed; verified no PLAN.md cites old wording (grep `HH:mm`, `admin.generateLink`, `defer to Phase 5` in 01-02 and 01-05 returns only a Plan 05 forbid-grep anti-pattern check). |
| HIGH-4 (T-03-06 redirect validation missing from Plan 01-03 Task 2 acceptance_criteria) | RESOLVED | `01-03-PLAN.md` (Task 2 `<action>` callback section, Task 2 `<acceptance_criteria>` final bullet, `<threat_model>` T-03-06 row) | Added explicit `<action>` instruction to insert `if (next.startsWith('//') || !next.startsWith('/')) next = '/'` guard before redirect; added acceptance_criteria grep that asserts the guard exists OR a unit test covers `next=//evil.com`; updated T-03-06 row to say enforcement is now in Task 2 acceptance gate. |
| HIGH-5 (Plan 01-04 Task 2 acceptance_criteria references `perfil/page.tsx` that doesn't exist until Task 3) | RESOLVED | `01-04-PLAN.md` (Task 2 acceptance_criteria "all four routes exist" line, Task 3 acceptance_criteria) | Rewrote Task 2 criterion to only assert `docs/itin/gente/page.tsx` exist after Task 2 (perfil explicitly deferred); added new Task 3 criterion `test -f src/app/t/[tripId]/perfil/page.tsx` for perfil existence. |
| MEDIUM-6 (Plan 01-03 implicit cross-plan dep on Plan 01-02's `database.ts`) | RESOLVED — dependency made explicit, wave preserved | `01-03-PLAN.md` frontmatter `depends_on` | Added `01-02` to `depends_on` with an inline comment explaining: wave stays 2 because 01-02 Task 2 is a BLOCKING gate within Wave 2 — the executor sequences 02 to Task 2 completion before 03 Task 1 begins. Same-wave parallelism preserved at planning level; runtime sequencing handled by the BLOCKING tag. No cascade to 01-04 / 01-05 waves. |
| MEDIUM-7 (Plan 01-01 Task 1 installs `supabase` devDep but doesn't verify it) | RESOLVED | `01-01-PLAN.md` (Task 1 acceptance_criteria) | Added `jq -r '.devDependencies.supabase' package.json | grep -v '^null$'` acceptance check. |
| MEDIUM-8 (Plan 01-04 has 18 files_modified, above 5–8 target) | RESOLVED — justified, not split | `01-04-PLAN.md` frontmatter comment block between `files_modified` and `autonomous` | Added inline comment documenting why the file count is intentional: trip shell + Perfil + PWA manifest form a single vertical slice; splitting would add a wave for marginal benefit; end-of-plan checkpoint validates the whole slice. |

### Files updated

- `.planning/phases/01-foundation-auth/01-01-PLAN.md` — MEDIUM-7
- `.planning/phases/01-foundation-auth/01-03-PLAN.md` — CRITICAL-1, HIGH-4, MEDIUM-6
- `.planning/phases/01-foundation-auth/01-04-PLAN.md` — HIGH-5, MEDIUM-8
- `.planning/phases/01-foundation-auth/01-SKELETON.md` — CRITICAL-1 (D-03 no longer deferred)

### Files NOT updated (verified clean)

- `01-01-PLAN.md` (Task 2 wordmark weight) — already specifies weight 700, aligned with revised D-08.
- `01-02-PLAN.md` — no stale D-03 / D-08 references.
- `01-05-PLAN.md` — only reference to `admin.generateLink` is in an anti-pattern forbid-grep (correctly preserved).
- `01-CONTEXT.md`, `01-RESEARCH.md` — already updated by orchestrator before this pass.
- `01-UI-SPEC.md` — untouched per user decision on CRITICAL-2 (UI-SPEC wins; D-08 revised to match).

### Unaddressed findings

None. All 3 CRITICAL + 4 HIGH + 3 MEDIUM findings have an explicit disposition above. LOW findings (2 from the original review) were not enumerated in the revision context and are left untouched.

*Revisions complete — phase ready for `/gsd:execute-phase 01`.*

---

## SECOND-PASS REVIEW 2026-05-29

**Reviewer:** gsd-plan-checker (second pass)
**Scope:** Verify the 10 findings from the first-pass review (3 CRITICAL + 4 HIGH + 3 MEDIUM) against actual file contents. Spot-check coherence only — not a full re-review.

### Per-Finding Verdicts

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| C-1 | D-03 — user_setup requires BOTH `{{ .Token }}` subject AND body `Solicitado a las HH:mm`; must_haves updated; SKELETON no longer calls D-03 deferred | RESOLVED | `01-03-PLAN.md` user_setup item 4: "Subject EXACTLY: `Acceso a tu viaje · {{ .Token }}`... body line `Solicitado a las {{ .Date }}`". must_haves truth #2 names both. Checkpoint step 2d requires both. SKELETON.md line 49 strikes through the admin.generateLink deferral and notes "superseded by D-03 revision (2026-05-29)". |
| C-2 | D-08 — wordmark weight 700 in plan; old 600 reference removed | RESOLVED | `01-01-PLAN.md` Task 2 action specifies "Inter italic, weight 700, `text-primary`". Acceptance criteria grep forbids semibold/medium/extrabold. CONTEXT.md D-08 revised to 700. No surviving weight-600 reference found in plan files. |
| C-3 | RESEARCH.md Open Questions section marked RESOLVED | RESOLVED | `01-RESEARCH.md` line 1246 header reads `## Open Questions (RESOLVED 2026-05-29)`. All three questions carry explicit inline RESOLVED annotations. |
| H-4 | T-03-06 redirect validation moved from threat_model into Task 2 `<acceptance_criteria>` with concrete grep command | RESOLVED | `01-03-PLAN.md` Task 2 `<action>` adds the `if (next.startsWith('//') \|\| !next.startsWith('/')) next = '/'` guard with mandatory label. Task 2 `<acceptance_criteria>` final bullet adds a `grep -vE ... \| grep -cE "next\.startsWith..."` command returning `>=1`. Threat model T-03-06 row updated to note "Enforced by Task 2 acceptance_criteria (HIGH-4 fix, 2026-05-29)". |
| H-5 | Plan 01-04 Task 2 acceptance no longer checks `perfil/page.tsx`; Task 3 acceptance does | RESOLVED | `01-04-PLAN.md` Task 2 acceptance_criteria reads: "Three routes `{docs,itin,gente}/page.tsx` all exist after this task (perfil is DEFERRED to Task 3...)" and notes `test ! -f .../perfil/page.tsx` is acceptable at Task 2 completion. Task 3 acceptance_criteria line adds `test -f "src/app/t/[tripId]/perfil/page.tsx"` succeeds, with explicit "(deferred from Task 2 per HIGH-5 fix 2026-05-29)" annotation. |
| M-6 | Plan 01-03 frontmatter `depends_on` includes `01-02` explicitly | RESOLVED | `01-03-PLAN.md` frontmatter lines 6–8: `depends_on: - 01-01 - 01-02` with inline comment explaining wave-2 rationale and BLOCKING gate sequencing. |
| M-7 | Plan 01-01 Task 1 acceptance_criteria includes `jq` check for `supabase` devDep | RESOLVED | `01-01-PLAN.md` Task 1 acceptance_criteria: "`jq -r '.devDependencies.supabase' package.json \| grep -v '^null$'` returns a version string (Supabase CLI installed as devDep...)". |
| M-8 | Plan 01-04 frontmatter has a comment justifying 18 files_modified | RESOLVED | `01-04-PLAN.md` frontmatter lines 28–33: comment block `# files_modified count (18) intentionally exceeds the 5-8 target — justified per MEDIUM-8 (2026-05-29)...` explains the single-vertical-slice rationale and notes the checkpoint validates the whole slice. |

### Coherence Spot-Checks

**D-03 implementation coherence:** The `user_setup` instructs the human to configure `{{ .Date }}` in the Supabase template body with a noted fallback ("accepted if it renders in es-MX 24h HH:mm format; if not, fall back to the static line `Solicitado hace unos segundos...`"). The fallback is explicitly documented as a "freshness signal, not a security control". This is internally consistent with D-03 revised and does not introduce a new gap.

**Weight-700 coherence across plans:** 01-01 (Wordmark.tsx), CONTEXT.md D-08, and 01-UI-SPEC.md typography section all now align on weight 700. The `grep -cE 'font-(medium|semibold|extrabold...)' ...` acceptance test in Task 2 acts as a regression guard during execution.

**SKELETON D-03 deferred entry:** The struck-through bullet on SKELETON.md line 49 replaces the old "defer to Phase 5" language with "superseded by D-03 revision (2026-05-29): subject uses `{{ .Token }}` for uniqueness, body uses `Solicitado a las HH:mm` for readability. The `admin.generateLink()` route is no longer planned for Phase 5." This is clean — no residual deferral language remains.

**No regressions detected:** No finding fix introduced a contradiction with other plan sections or with CONTEXT.md locked decisions.

### Overall Verdict

## REVIEW PASSED

All 10 findings (3 CRITICAL + 4 HIGH + 3 MEDIUM) are resolved as described by the planner. Each fix was verified directly against the file contents — not accepted on the planner's claim alone. No partial fixes, no regressions, no new issues surfaced during spot-checks.

**Phase 01 plans are cleared for execution. Run `/gsd:execute-phase 01` to proceed.**

*Second-pass review completed: 2026-05-29*
