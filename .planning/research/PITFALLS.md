# Pitfalls Research

**Domain:** Group trip planning PWA — offline-first document vault, magic link auth, serverless, Spanish UI
**Researched:** 2026-05-29
**Confidence:** HIGH (PWA/iOS), HIGH (Supabase RLS), HIGH (magic link), MEDIUM (scope/i18n debt)

---

## Critical Pitfalls

### Pitfall 1: iOS Safari Storage Eviction Wipes the Document Vault

**Severity:** CRITICAL

**What goes wrong:**
iOS Safari enforces a 7-day cap on script-writable storage (Cache API, IndexedDB) for origins not visited in that window. A user who installs the PWA, uploads their boarding pass, then doesn't open the app for 8 days before the flight arrives at the airport to find an empty vault.

**Why it happens:**
Safari's Intelligent Tracking Prevention (ITP) applies to all script-writable storage — including service worker caches and IndexedDB — not just cookies. Developers test on desktop Chrome (no eviction) and Android Chrome (also lenient) and never hit this on iOS.

**How to avoid:**
- Request the Persistent Storage API (`navigator.storage.persist()`) immediately after PWA install. Safari 17+ supports this.
- Add to Home Screen is the critical gate: data is preserved long-term only when launched from the home screen. Drive users aggressively to install via "Add to Home Screen" prompt during onboarding.
- Cache documents on every launch (not just the first), so re-caching after eviction happens automatically.
- Store document metadata in Supabase (remote source of truth). On open, re-download cached docs if local cache is empty. Show a "Syncing documents..." state so users know what's happening.
- Test specifically with a real iPhone, real Safari, after simulating 7 days of inactivity.

**Warning signs:**
- Testing only on Chrome/Android and assuming iOS works the same.
- No persistent storage permission requested at onboarding.
- Users complain "my tickets disappeared."

**Phase to address:** Phase 1 (PWA foundation) — must be addressed before the first real document upload feature ships.

---

### Pitfall 2: Supabase RLS Disabled by Default — Data Fully Exposed

**Severity:** CRITICAL

**What goes wrong:**
Every new Supabase table has RLS disabled. If you create the `documents`, `trips`, or `members` tables and forget `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, every row is publicly readable via the anon API key. Anyone with the Supabase project URL and the anon key (which lives in client-side JS) can read all users' boarding passes and reservation codes.

**Why it happens:**
The Supabase UI does not warn loudly when RLS is off. CVE-2025-48757 (January 2025) found 10.3% of analyzed Lovable-built Supabase apps were leaking all user data through this exact mistake.

**How to avoid:**
- Enable RLS on every table immediately when creating it — make this a non-negotiable migration convention.
- Add SELECT, INSERT, UPDATE, DELETE policies explicitly. An enabled table with no policies returns empty results for all users, which will appear as a bug and tempt you to turn RLS off "temporarily."
- Use `(select auth.uid())` wrapper in policies (not bare `auth.uid()`) to avoid per-row re-evaluation overhead.
- Test RLS from the client SDK (not the SQL editor, which bypasses RLS).
- Write a policy test: log in as user A, attempt to fetch trip owned by user B. Expect 0 rows.

**Warning signs:**
- Table created without explicit RLS migration step.
- "My policy isn't working" → developer turns off RLS to debug.
- SQL editor queries work but client SDK queries return empty.

**Phase to address:** Phase 1 (data model / auth) — RLS must be in place before any documents or trip data exist.

---

### Pitfall 3: Next.js Server Action 1MB Body Limit Kills File Uploads

**Severity:** CRITICAL

**What goes wrong:**
Next.js server actions have a default 1MB request body limit. A user tries to upload a PDF boarding pass (often 1-5MB) through a server action and gets a silent failure or cryptic 413 error.

**Why it happens:**
Developers scaffold a file upload form, test with a tiny PNG, it works, ship it. First real user uploads a multi-page PDF itinerary (5MB+) and it silently fails.

**How to avoid:**
- Use signed upload URLs instead of server actions for file uploads. The client requests a signed URL from the API, then POSTs directly to Supabase Storage — no Next.js server body size limit applies.
- Enforce a client-side file size check (warn if > 50MB — Supabase free tier hard limit) before attempting upload.
- Show upload progress via the Supabase Storage client's upload callbacks, not a spinner that disappears on failure.
- TUS resumable uploads (Supabase supports this) are recommended for files > 6MB.

**Warning signs:**
- Upload form using `formData` passed to a server action.
- No client-side file size validation.
- No visible upload progress.
- Testing only with small files.

**Phase to address:** Phase 2 (document vault) — architecture decision must be made at feature design time, not discovered mid-upload.

---

### Pitfall 4: Magic Link Gmail Threading — User Clicks Expired Link

**Severity:** HIGH

**What goes wrong:**
When a user requests multiple magic links (common: "it didn't work, send again"), Gmail groups all the emails into a single conversation thread. The user opens the thread and clicks the first (oldest, expired) link. Auth fails. They try again, same problem.

**Why it happens:**
Gmail threads emails with the same Subject. If your subject is always "Tu enlace de acceso a SharedTrip", every magic link email stacks in one thread. The newest link is at the bottom of the thread, not where users look first.

**How to avoid:**
- Make the Subject unique per request, e.g., "Tu enlace de acceso — 14:32" (include a timestamp or short unique token).
- Use unique `Message-ID` and avoid `In-Reply-To` headers that would trigger threading.
- In the email body, explicitly state "Este enlace expira en 15 minutos. Si solicitaste varios, usa solo este."
- Set expiry to 15 minutes (balance between security and mobile network delays).

**Warning signs:**
- Subject line is a static string.
- No timestamp or uniquifier in the email subject.
- Users report "the link doesn't work" when they requested auth more than once.

**Phase to address:** Phase 1 (auth) — email template design must address this before first user invite.

---

### Pitfall 5: Magic Link Same-Browser Restriction Breaks Mobile Flow

**Severity:** HIGH

**What goes wrong:**
Some auth implementations (including some Supabase magic link flows) validate that the link is opened in the same browser/device that requested it. A user on their phone opens WhatsApp, taps a trip invite link in Safari, requests a magic link, switches to their Gmail app (which opens in Chrome), taps the magic link — auth fails with a confusing error.

**Why it happens:**
PKCE (Proof Key for Code Exchange) flow ties the auth request to the originating browser session. Cross-app navigation on iOS breaks this because Safari and Chrome are different browser contexts.

**How to avoid:**
- For a friend-circle app where security threats are low, use the implicit (non-PKCE) flow for magic links, or configure Supabase to not enforce same-browser validation.
- Document the expected flow: "Abre el enlace en el mismo navegador donde pediste el código."
- Consider OTP (6-digit code) as a fallback for users who hit cross-browser issues. Supabase supports this alongside magic links.
- Show a helpful error message in Spanish when the link fails, not a generic 401.

**Warning signs:**
- Testing only on desktop (no cross-app navigation).
- Users on iOS report "el enlace no funciona" after switching between apps.

**Phase to address:** Phase 1 (auth) — test the mobile cross-app flow on a real iPhone before launch.

---

### Pitfall 6: Service Worker Update Trap — Users Stuck on Old Version

**Severity:** HIGH

**What goes wrong:**
A user installs the PWA and caches a broken version. You push a fix. The service worker serves the old (broken) version from cache until the user closes all tabs and reopens — which may never happen on mobile. Users are stuck on the bug permanently unless they manually clear cache.

**Why it happens:**
Service workers only update when all tabs using the old worker are closed. On mobile, tabs are never "closed" — they persist in background. The default update lifecycle does not force-replace the active worker.

**How to avoid:**
- Use `skipWaiting()` + `clients.claim()` in the service worker activate event to force immediate takeover.
- Implement a version check on every app load: compare a `version.json` fetched with `cache: 'no-cache'` against the cached app version. If mismatch, show a toast "Nueva versión disponible" with a reload button.
- Use Workbox (integrated via `next-pwa` or `@serwist/next`) which handles cache versioning automatically.
- Do NOT hash the service worker filename (`sw.js` not `sw.abc123.js`) — the browser detects updates by comparing the file contents of the fixed URL.

**Warning signs:**
- No version mismatch detection in the app.
- No `skipWaiting()` in the service worker.
- Users report seeing old UI after you've deployed a fix.

**Phase to address:** Phase 1 (PWA foundation) — bake this into the service worker setup from day one, not retrofit later.

---

### Pitfall 7: Offline Upload Queue — Document Uploaded While Offline Is Lost

**Severity:** HIGH

**What goes wrong:**
User is at the airport (roaming, no wifi), snaps a photo of their boarding pass, "uploads" it to SharedTrip — the app shows success (or no error). They board. Later, the document is nowhere in the vault. The upload silently failed because they were offline.

**Why it happens:**
Without explicit offline queue handling, a fetch to Supabase Storage while offline throws a network error that may be swallowed. The Background Sync API (which would retry on reconnect) is not supported in Safari.

**How to avoid:**
- Detect offline state (`navigator.onLine` + `offline`/`online` events) before initiating upload.
- Store pending uploads in IndexedDB with status `pending_sync`.
- On reconnect, process the pending queue explicitly (don't rely on Background Sync API — not available in Safari).
- Show persistent UI indicator: "3 documentos pendientes de subir. Conecta a internet para sincronizar."
- Never show a "success" state until the server confirms upload.
- For the v1 MVP: it's acceptable to show "Necesitas conexión para subir documentos" and block the upload action when offline, rather than queuing — simpler and honest.

**Warning signs:**
- Upload action not gated on `navigator.onLine`.
- No pending upload state in the UI.
- Relying on Background Sync without testing on Safari.

**Phase to address:** Phase 2 (document vault) — the offline upload queue (or explicit block) is part of the upload feature, not a later add-on.

---

### Pitfall 8: Supabase Free Tier — Project Pauses After 1 Week of Inactivity

**Severity:** HIGH

**What goes wrong:**
The Supabase free tier automatically pauses projects after 7 days without activity. When a paused project receives a request, it takes ~30 seconds to wake up. A user opens SharedTrip at the airport, the app stalls for 30 seconds on the first API call, they give up and miss their document.

**Why it happens:**
Supabase free tier pauses inactive projects to conserve resources. This is documented but easy to miss in initial setup.

**How to avoid:**
- Set up a free cron job (e.g., cron-job.org) that pings the Supabase health endpoint (`/rest/v1/` with the anon key) every 3 days to prevent pausing.
- Alternatively, upgrade to Pro ($25/month) after the first real trip validates the concept — cost is justified if it works.
- In the meantime, cache all trip data and documents offline aggressively so the app works even if Supabase is slow to wake.

**Warning signs:**
- No keep-alive mechanism.
- Supabase dashboard shows project as "Paused."
- First user request after a gap takes 30+ seconds.

**Phase to address:** Phase 1 (infrastructure setup) — configure the keep-alive ping before the first real user accesses the app.

---

### Pitfall 9: File Upload Egress Costs — 1GB Free Tier Burned by PDF Downloads

**Severity:** HIGH

**What goes wrong:**
Supabase free tier includes 1GB storage and 5GB bandwidth. Each time a member opens a trip and loads the document vault, the PDFs are re-downloaded. With 6 group members each opening the vault 3 times across a trip, a 10MB PDF gets downloaded 18 times = 180MB egress per document. With 5 documents, you've burned 900MB of your 5GB allowance on a single trip.

**Why it happens:**
Developers think of storage limits, not egress/bandwidth limits. Supabase charges bandwidth at $0.09/GB after the free tier.

**How to avoid:**
- Cache downloaded documents aggressively in IndexedDB once fetched. Re-use the local cache for subsequent opens (the offline-first architecture solves this for free).
- Use Supabase signed URLs with long expiry for direct download links, not proxy routes through Next.js (which would count against Vercel bandwidth too).
- Compress images before upload (client-side, before storage). A photo of a boarding pass can go from 4MB to 400KB with ~80% quality JPEG re-encode.

**Warning signs:**
- Documents re-fetched from Supabase Storage on every page open.
- No local caching of downloaded blobs in IndexedDB.
- No client-side image compression before upload.

**Phase to address:** Phase 2 (document vault) — caching strategy and upload compression are design decisions, not optimizations.

---

### Pitfall 10: EXIF Orientation — Boarding Pass Photo Displays Sideways

**Severity:** MEDIUM

**What goes wrong:**
User takes a photo of their boarding pass in portrait mode on an iPhone. The photo uploads. Every member in the trip sees the photo rotated 90 degrees sideways. The QR code is unreadable.

**Why it happens:**
iOS embeds EXIF orientation metadata in JPEG files but the HTML `<img>` element ignores EXIF orientation. CSS does not auto-rotate. The pixel data in the file is "sideways," and the EXIF tag that says "rotate this" is silently ignored.

**How to avoid:**
- Use the `browser-image-compression` or `exifr` library client-side to read EXIF orientation, rotate the canvas to the correct orientation, and re-export the image before upload. Strip remaining EXIF data for privacy (removes GPS coordinates).
- Apply CSS `image-orientation: from-image` as a CSS fallback — supported in modern browsers including Safari — but not reliable enough alone.

**Warning signs:**
- Testing with photos taken on a laptop (no EXIF orientation issue).
- No EXIF-aware image processing in the upload pipeline.

**Phase to address:** Phase 2 (document vault) — part of the upload preprocessing step.

---

### Pitfall 11: Hardcoded Spanish Strings — i18n Retrofit Is 10x More Expensive

**Severity:** MEDIUM

**What goes wrong:**
You hardcode strings directly in JSX: `<h1>Tu viaje a París</h1>`, `Añadir documento`, `3 miembros`. Six months later you want to support Portuguese for Brazilian users (the natural expansion market). Every string needs to be extracted, keyed, and translated. The codebase has 400+ hardcoded strings scattered across 60 files.

**Why it happens:**
The project is "solo Spanish only," so i18n feels like over-engineering. But the cost of retrofitting is exponentially higher than building with extraction in mind from day one.

**How to avoid:**
- Even in a single-language app, put all user-facing strings in a single `es.ts` dictionary file (`src/i18n/es.ts`). Use a typed key accessor (`t('upload.success')`) even without a full i18n library.
- This costs 10 minutes of setup and zero runtime overhead, but makes future localization a find-and-replace rather than an archaeology expedition.
- Do not use `next-intl` or full i18n libraries in v1 — overkill. A simple typed dictionary is enough.
- Date formatting: always use `Intl.DateTimeFormat` with explicit locale (`'es-MX'` or `'es'`) — never `.toLocaleDateString()` without locale which varies by system locale.
- Currency: use `Intl.NumberFormat` with `style: 'currency'` and `currency: 'MXN'` (or parameterized) — never string-concatenate "$ " + amount.

**Warning signs:**
- User-visible text written directly in JSX.
- `new Date().toLocaleDateString()` without explicit locale.
- "$" + amount string concatenation.

**Phase to address:** Phase 1 (project setup) — establish the `es.ts` dictionary and formatting utilities before writing any UI text.

---

### Pitfall 12: Solo Dev Scope Creep — Miss the Real Trip Deadline

**Severity:** CRITICAL

**What goes wrong:**
The real deadline is the next trip (< 1 month). The developer adds "nice to have" features — map integration, expense splitting, real-time presence indicators — each one small, all of them collectively causing a slip that means the app isn't ready when the plane departs. The app that would have been "good enough" for the trip never ships.

**Why it happens:**
Every feature feels "almost free" when you're already building. The pain point of "no document vault" is real, but the gap between MVP and "the version I imagined" is never-ending for solo developers.

**How to avoid:**
- The v1 definition in PROJECT.md is the law. Any feature not in the v1 list goes to a backlog file immediately, not "while I'm here."
- Time-box each feature. If an implementation takes more than 2x the estimate, it's a scope signal.
- The test for "is this v1?" is: "Would the trip fail without this?" Document vault = YES. Map pins = NO.
- Validate with the actual users (the travel group) after the minimum viable vault works — their feedback matters more than imagined features.

**Warning signs:**
- Building v1.5 features (expenses) before v1 features (document vault) work end-to-end.
- "Just a quick addition" appearing in commit messages before the core flow is tested.
- No end-to-end user flow test with a real group member.

**Phase to address:** Every phase — this is a process discipline issue, not a technical one. Each phase should have an explicit "done" definition from PROJECT.md.

---

### Pitfall 13: Group Member Removal — Removed Member Retains Cached Documents

**Severity:** MEDIUM

**What goes wrong:**
A member is removed from a trip (or leaves). Their Supabase access is revoked. But the documents are cached in their browser's IndexedDB. They can still open the PWA offline and see all the boarding passes, passport scans, and reservation codes of everyone in the group.

**Why it happens:**
RLS correctly prevents server-side access after removal, but offline-cached data is not invalidated. The service worker and IndexedDB are entirely client-side.

**How to avoid:**
- When the app comes online, check membership status on every session start. If the user is no longer a member, clear IndexedDB and the service worker cache for that trip.
- Never store sensitive documents in IndexedDB without an expiry/invalidation mechanism.
- For v1 MVP with a close friend circle, this risk is acceptable. Document the threat model clearly so it's a known tradeoff, not an oversight.

**Warning signs:**
- No membership re-validation on session restore.
- Sensitive documents cached indefinitely with no eviction logic.

**Phase to address:** Phase 2 (document vault + auth integration) — at minimum, document the accepted risk for v1.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded Spanish strings in JSX | 2 min faster per component | 10x cost to retrofit i18n | Never — use es.ts dictionary instead (5 min setup) |
| Skip RLS on "internal" tables | Faster prototyping | Data leakage across users | Never — always enable RLS |
| No upload progress UI | Simpler implementation | Silent failures on mobile networks | MVP only, with explicit plan to add before first real user |
| Sync upload (no offline queue) | No queue complexity | Lost documents on mobile network drop | Acceptable in v1 if upload is clearly blocked when offline |
| No keep-alive ping for Supabase | No setup overhead | 30s cold start for first user request | Never — 5 min setup prevents critical UX failure |
| No EXIF rotation on upload | Faster upload code | Sideways photos of boarding passes | Never — use browser-image-compression (1 line of code) |
| No cache versioning in service worker | Simpler SW code | Users stuck on broken versions forever | Never — Workbox handles this automatically |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Storage + Next.js | File upload via server action hits 1MB body limit | Use signed upload URLs — client uploads directly to Supabase Storage |
| Supabase Auth (magic link) | Same email subject → Gmail threads → expired link clicks | Add timestamp to email subject; unique Message-ID per email |
| Supabase Free Tier | Project pauses after 7-day inactivity | Set up keep-alive cron job pinging `/rest/v1/` every 3 days |
| Supabase RLS | Testing via SQL editor (bypasses RLS) | Always test RLS from client SDK with user JWT |
| iOS Safari + IndexedDB | 7-day eviction if app not added to Home Screen | Request persistent storage; drive Home Screen install; re-cache on every launch |
| Supabase Storage + egress | Every document open re-downloads from server | Cache blobs in IndexedDB on first download; serve from local cache thereafter |
| Next.js + Supabase Auth (PKCE) | Magic link fails when opened in different browser on iOS | Use implicit flow OR document that users must open link in same browser |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No IndexedDB blob caching | Every document open re-fetches from Supabase | Cache blobs on first fetch, serve locally | At 6 users × 5 docs × 3 opens = ~5GB egress/trip |
| Supabase project pause cold start | First request takes 30 seconds | Keep-alive cron job every 3 days | Immediately on first user request after a gap |
| RLS auth.uid() without select wrapper | Slow queries on tables with many rows | Use `(select auth.uid())` in policies | Noticeable at 1000+ rows; irrelevant for small trips but good habit |
| Service worker caching static assets without versioning | Deploy breaks for cached users | Workbox with auto-versioning | Every deployment after go-live |
| Uncompressed image upload | Storage and egress quota burned quickly | Client-side compression before upload | At ~50 photos per trip per group |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| RLS disabled on any table | All user data readable via anon key | Enable RLS + policies on every table immediately on creation |
| Service role key in client-side code | Bypasses all RLS; full database access | Service key only in server-side environment variables, never in browser JS |
| Signed URLs with very long expiry (days/weeks) | Removed member can still access documents via cached URL | Use short-lived signed URLs (< 1 hour); re-generate on each document open |
| No file type validation | Malicious file upload (executable disguised as PDF) | Validate MIME type server-side (not just extension); Supabase Storage supports MIME type restrictions |
| EXIF GPS data in uploaded photos | Location metadata leaks where user was when photo taken | Strip EXIF before upload using client-side processing |
| Magic link forwarded/shared | Third party can authenticate as the link recipient | Short expiry (15 min); one-time use (Supabase invalidates used links); warn users not to share auth emails |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No upload progress indicator | User submits again thinking it failed; duplicate uploads | Show progress bar / spinner with percentage during upload |
| Generic error messages in English | Spanish users can't diagnose or recover | All error states must be in Spanish with a recovery action |
| No "you're offline" state | User attempts to upload, nothing happens, document is lost | Detect offline state and show "Sin conexión — los documentos se guardan localmente" |
| No "Add to Home Screen" prompt | iOS users miss persistent storage benefit; vault data evicted in 7 days | Show contextual install prompt on first document upload with explanation "Para acceso offline confiable" |
| Date displayed as MM/DD (American format) | Spanish users see "06/07" and don't know if it's June 7 or July 6 | Always use `Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' })` — outputs "7 de junio" unambiguously |
| Session expires mid-trip with no recovery path | User at airport can't re-auth without wifi | Store session tokens with long expiry (30+ days); offline-cached docs should not require re-auth to view |

---

## "Looks Done But Isn't" Checklist

- [ ] **Document vault:** Works on desktop Chrome — verify on real iPhone Safari in airplane mode after 8+ days without opening the app.
- [ ] **Magic link auth:** Works on desktop — verify on iPhone where email opens in Gmail app (Chrome) while invite link was opened in Safari.
- [ ] **File upload:** Works with a 50KB test image — verify with a 5MB PDF boarding pass on a 3G connection that drops mid-upload.
- [ ] **Offline access:** Service worker "installed" — verify by opening DevTools > Application > Service Workers > Offline checkbox and confirming all documents load.
- [ ] **RLS policies:** Queries work as the table owner — verify by testing from the client SDK with a different user's JWT that they cannot read another user's trip documents.
- [ ] **PWA install:** "Installable" banner appears on Chrome — verify the iOS Safari "Add to Home Screen" manual flow works and persistent storage is requested.
- [ ] **Date formatting:** Dates display correctly on your locale — verify on a device set to `en-US` locale that dates still appear in Spanish DD/Month format.
- [ ] **Supabase keep-alive:** Project is active — verify by checking Supabase dashboard after 8 days without manual visits.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS not enabled, data exposed | HIGH | Immediately enable RLS; rotate any exposed tokens; notify affected users; audit what was accessible |
| Users stuck on broken cached version | MEDIUM | Push a new service worker with `skipWaiting()`; add a manual "force reload" button to the UI; communicate via WhatsApp to group |
| Supabase project paused before trip | LOW | Manually resume from Supabase dashboard; set up keep-alive immediately; 30 seconds to recover |
| Documents evicted on iOS (7-day) | MEDIUM | User must re-open trip while online to re-cache; add "Re-sincronizar documentos" button in UI; drive Home Screen install |
| 50MB file size limit hit | LOW | Reject at client-side before upload; show "Comprime el archivo o usa un PDF de menor tamaño"; provide link to ilovepdf.com |
| Magic link landing in spam | MEDIUM | Use an established transactional email provider (Resend/Postmark); set up SPF/DKIM/DMARC on the sending domain; add whitelist instructions to the invite message |

---

## Pitfall-to-Phase Mapping

| Pitfall | Severity | Prevention Phase | Verification |
|---------|----------|------------------|--------------|
| iOS 7-day storage eviction | CRITICAL | Phase 1 (PWA foundation) | Test on real iPhone after 8-day gap |
| RLS disabled by default | CRITICAL | Phase 1 (data model) | Client SDK test with cross-user JWT |
| Next.js 1MB upload limit | CRITICAL | Phase 2 (document vault) | Upload 5MB PDF end-to-end on mobile |
| Gmail magic link threading | HIGH | Phase 1 (auth) | Request link twice, check Gmail thread |
| Same-browser magic link failure | HIGH | Phase 1 (auth) | Test on iPhone: link in Gmail app while in Safari session |
| Service worker update trap | HIGH | Phase 1 (PWA foundation) | Deploy a change, verify old cached users see update prompt |
| Supabase project pause | HIGH | Phase 1 (infra setup) | Check dashboard after 8 days |
| Offline upload lost silently | HIGH | Phase 2 (document vault) | Upload while in airplane mode |
| Egress quota burnout | HIGH | Phase 2 (document vault) | Monitor Supabase bandwidth dashboard after first real trip |
| EXIF image rotation | MEDIUM | Phase 2 (document vault) | Upload iPhone portrait photo, verify display orientation |
| Hardcoded i18n strings | MEDIUM | Phase 1 (project setup) | Audit: grep for string literals in JSX before first commit |
| Scope creep / deadline miss | CRITICAL | All phases | Each phase has explicit "done" criteria from PROJECT.md |
| Removed member sees cached docs | MEDIUM | Phase 2 (document vault) | Document as known v1 tradeoff; add membership check on session restore |

---

## Sources

- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [What Safari's 7-day cap on script-writeable storage means for PWA developers — Search Engine Land](https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519)
- [Offline-first frontend apps in 2025: IndexedDB and SQLite — LogRocket](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/)
- [Building Offline-First Web Applications — Let's Build Solutions](https://letsbuildsolutions.com/blog/web-engineering/building-offline-first-web-applications-service-workers-indexeddb-and-sync-strategies-for-production/)
- [Supabase RLS: Common Mistakes, the (select auth.uid()) Trap & CVE-2025-48757](https://vibeappscanner.com/supabase-row-level-security)
- [Why Your Supabase Data Is Exposed (And You Don't Know It) — DEV Community](https://dev.to/jordan_sterchele/why-your-supabase-data-is-exposed-and-you-dont-know-it-25fh)
- [Supabase RLS Best Practices: Production Patterns — Makerkit](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Row Level Security — Supabase Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Magic Link Authentication — Postmark Guide](https://postmarkapp.com/blog/magic-links)
- [Are Magic Links Secure: Technical Deep Dive — MojoAuth](https://mojoauth.com/blog/are-magic-links-secure-technical-deep-dive)
- [Passwordless magic link setup issues — Auth0 Community](https://community.auth0.com/t/passwordless-magic-link-setup-issues-link-expiry-device-session-handling/194103)
- [Service Worker File Upload Limits — Supabase Docs](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Supabase Free Tier Limits 2026 — AI Agency Plus](https://aiagencyplus.com/supabase-free-tier-limits/)
- [Complete Guide: File Uploads with Next.js and Supabase Storage — Supa Launch](https://supalaunch.com/blog/file-upload-nextjs-supabase)
- [When "Just Refresh" Doesn't Work: Taming PWA Cache — Infinity Interactive](https://iinteractive.com/resources/blog/taming-pwa-cache-behavior)
- [5 ways I beat scope creep as a solo dev — Medium](https://medium.com/@rimnassih/5-ways-i-beat-scope-creep-with-real-examples-as-a-solo-dev-c5f9bf7331a4)
- [Handling dates, times, numbers, and currencies in i18n — SimpleLocalize](https://simplelocalize.io/blog/posts/handling-dates-times-numbers-localization/)
- [EXIF Data and Image Orientation — Higher Logic](https://support.higherlogic.com/hc/en-us/articles/360032696052-EXIF-Data-and-Image-Orientation)

---
*Pitfalls research for: SharedTrip — Group trip PWA, offline-first document vault, magic link auth, Supabase/Next.js/Vercel*
*Researched: 2026-05-29*
