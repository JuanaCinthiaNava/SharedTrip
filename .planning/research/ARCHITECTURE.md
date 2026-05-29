# Architecture Research

**Domain:** Group Trip / Event PWA — Offline-first document vault + collaboration hub
**Researched:** 2026-05-29
**Confidence:** HIGH (Supabase, Next.js, PWA patterns verified against official docs and multiple sources)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (PWA)                           │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │   Next.js App    │  │  Service Worker  │  │   IndexedDB       │  │
│  │  (App Router)    │  │  (Serwist/SW)    │  │  (idb / Dexie)    │  │
│  │                  │  │                  │  │                   │  │
│  │ - Pages/Routes   │  │ - Precache HTML  │  │ - Cached docs     │  │
│  │ - React UI       │  │ - Cache-First    │  │ - Trip metadata   │  │
│  │ - Supabase SDK   │  │   for docs       │  │ - Offline queue   │  │
│  │ - Realtime sub   │  │ - Network-First  │  │                   │  │
│  └────────┬─────────┘  │   for data API   │  └───────────────────┘  │
│           │            └──────────────────┘                         │
│           │  HTTPS / WebSocket (Supabase Realtime)                  │
└───────────┼──────────────────────────────────────────────────────────┘
            │
┌───────────┼──────────────────────────────────────────────────────────┐
│           │            BACKEND LAYER (Supabase BaaS)                 │
│           │                                                          │
│  ┌────────▼─────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Supabase Auth   │  │  Postgres + RLS  │  │ Supabase Storage  │  │
│  │                  │  │                  │  │                   │  │
│  │ - Magic Link OTP │  │ - trips          │  │ - PDFs / images   │  │
│  │ - Anon sign-in   │  │ - trip_members   │  │ - Signed URLs     │  │
│  │ - JWT sessions   │  │ - documents      │  │ - Resumable upload│  │
│  │                  │  │ - itinerary_items│  │ - Bucket per trip │  │
│  └──────────────────┘  │ - expenses (v1.5)│  └───────────────────┘  │
│                        │ - locations (v2) │                         │
│  ┌─────────────────┐   └──────────────────┘                         │
│  │ Supabase        │                                                 │
│  │ Realtime        │   ┌──────────────────┐                         │
│  │                 │   │ Edge Functions   │                         │
│  │ - postgres_     │   │ (Deno / minimal) │                         │
│  │   changes       │   │                  │                         │
│  │ - itinerary     │   │ - Generate invite│  │
│  │   updates       │   │   links          │                         │
│  └─────────────────┘   │ - Create trip    │                         │
│                        └──────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
            │
┌───────────┼──────────────────────────────────────────────────────────┐
│           │              HOSTING LAYER                               │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐                         │
│  │  Vercel          │  │  Supabase Cloud  │                         │
│  │  (Next.js host)  │  │  (free tier)     │                         │
│  │  - CDN edge      │  │  - Auth + DB     │                         │
│  │  - Serverless fn │  │  - Storage       │                         │
│  │  - HTTPS auto    │  │  - Realtime      │                         │
│  └──────────────────┘  └──────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| Next.js App Router | UI rendering, routing, Server Actions for auth flows | Next.js 15 App Router (`app/`) |
| Service Worker (Serwist) | Cache-first for documents/assets, Network-first for API data | Serwist + Workbox strategies |
| IndexedDB (idb/Dexie) | Offline document blobs, trip metadata cache, mutation queue | `idb` or `Dexie.js` |
| Supabase Auth | Magic link OTP, anonymous sign-in, JWT session management | Supabase JS SDK |
| Postgres + RLS | Data storage, access control enforced at DB level | Per-trip RLS policies |
| Supabase Storage | PDF/image storage, signed upload/download URLs | Trip-scoped buckets |
| Supabase Realtime | Push itinerary changes to all group members | `postgres_changes` on itinerary_items |
| Edge Functions | Server-side invite link generation, trip creation admin ops | Supabase Edge Functions (Deno) |

---

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── manifest.ts               # PWA manifest (built-in Next.js support)
│   ├── sw.ts                     # Service worker entry (Serwist)
│   ├── layout.tsx                # Root layout — SW registration, install prompt
│   ├── page.tsx                  # Landing / trip list
│   ├── (auth)/
│   │   ├── login/page.tsx        # Magic link request form
│   │   └── callback/page.tsx     # OTP verification + session creation
│   ├── trip/
│   │   ├── [tripId]/
│   │   │   ├── page.tsx          # Trip hub (documents, itinerary tabs)
│   │   │   ├── documents/page.tsx
│   │   │   ├── itinerary/page.tsx
│   │   │   └── expenses/page.tsx  # v1.5
│   │   └── new/page.tsx
│   └── join/
│       └── [token]/page.tsx      # Invite link landing — anon sign-in + join trip
├── actions/                      # Next.js Server Actions (thin auth wrappers)
│   ├── auth.ts                   # signInWithOtp, verifyOtp
│   ├── trips.ts                  # createTrip, generateInviteToken
│   └── documents.ts              # getSignedUploadUrl, getSignedDownloadUrl
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (singleton)
│   │   ├── server.ts             # Server Supabase client (Server Actions / RSC)
│   │   └── middleware.ts         # Session refresh middleware
│   ├── offline/
│   │   ├── db.ts                 # IndexedDB schema (idb)
│   │   ├── cache.ts              # Document blob caching helpers
│   │   └── sync.ts               # Online reconnect sync queue
│   └── realtime/
│       └── useItinerarySync.ts   # Client hook: supabase.channel().on(postgres_changes)
├── components/
│   ├── documents/                # DocumentVault, DocumentCard, UploadModal
│   ├── itinerary/                # ItineraryList, ItineraryItem, AddActivity
│   ├── pwa/                      # InstallPrompt, OfflineBanner
│   └── ui/                       # Shared design system (shadcn/ui based)
└── types/
    └── database.ts               # Generated Supabase types
```

### Structure Rationale

- **`app/(auth)/`:** Auth callback route must be a separate page — OTP token arrives as URL hash, requires client-side verification.
- **`app/join/[token]/`:** Invite link entry point. Anonymous sign-in happens here server-side; joining trip is a single server action. Keeps invite UX to one page.
- **`actions/`:** Server Actions are the only place service role key is used — never exposed to browser. Keeps signed URL generation and invite token creation secure.
- **`lib/offline/`:** Encapsulates all IndexedDB logic. Service worker and React components both import from here (shared schema prevents drift).
- **`lib/supabase/`:** Separate client/server instances — critical for Next.js App Router (server components use cookies-based client, browser uses localStorage-based client).

---

## Data Model

### Entity Definitions

#### `trips`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `uuid` PK | Default `gen_random_uuid()` |
| `name` | `text` | Trip/event name |
| `description` | `text` nullable | Optional details |
| `start_date` | `date` nullable | |
| `end_date` | `date` nullable | |
| `created_by` | `uuid` FK → `auth.users` | Creator is auto-joined as admin |
| `invite_token` | `uuid` | Shareable token; used in join URL |
| `created_at` | `timestamptz` | |

#### `trip_members`
| Field | Type | Notes |
|-------|------|-------|
| `trip_id` | `uuid` FK → `trips` | |
| `user_id` | `uuid` FK → `auth.users` | |
| `role` | `text` | `admin` \| `member` |
| `joined_at` | `timestamptz` | |
| PK | `(trip_id, user_id)` | Composite |

#### `documents`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `uuid` PK | |
| `trip_id` | `uuid` FK → `trips` | |
| `uploaded_by` | `uuid` FK → `auth.users` | |
| `name` | `text` | Display name |
| `file_path` | `text` | Supabase Storage path: `trip-{tripId}/{filename}` |
| `file_type` | `text` | `pdf` \| `image` \| `other` |
| `file_size` | `int8` | Bytes |
| `description` | `text` nullable | Notes on the doc |
| `created_at` | `timestamptz` | |

#### `itinerary_items`
| Field | Type | Notes |
|-------|------|-------|
| `id` | `uuid` PK | |
| `trip_id` | `uuid` FK → `trips` | |
| `created_by` | `uuid` FK → `auth.users` | |
| `title` | `text` | Activity name |
| `description` | `text` nullable | |
| `location` | `text` nullable | Free-text location |
| `start_time` | `timestamptz` nullable | |
| `end_time` | `timestamptz` nullable | |
| `sort_order` | `int4` | For manual reordering |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### `expenses` (v1.5)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `uuid` PK | |
| `trip_id` | `uuid` FK → `trips` | |
| `paid_by` | `uuid` FK → `auth.users` | |
| `amount` | `numeric(10,2)` | |
| `currency` | `text` | Default `MXN` |
| `description` | `text` | |
| `split_between` | `uuid[]` | Array of user IDs sharing cost |
| `created_at` | `timestamptz` | |

#### `locations` (v2)
| Field | Type | Notes |
|-------|------|-------|
| `id` | `uuid` PK | |
| `trip_id` | `uuid` FK → `trips` | |
| `name` | `text` | Hotel, restaurant, etc. |
| `category` | `text` | `hotel` \| `restaurant` \| `attraction` \| `other` |
| `lat` | `float8` | |
| `lng` | `float8` | |
| `notes` | `text` nullable | |
| `created_at` | `timestamptz` | |

### Relationships

```
auth.users
    │
    ├── trips.created_by (1:N — user creates many trips)
    │
    └── trip_members.user_id
              │
              └── trips (N:M via trip_members — users belong to many trips)
                    │
                    ├── documents (1:N — trip has many docs)
                    ├── itinerary_items (1:N — trip has many items)
                    ├── expenses (1:N — v1.5)
                    └── locations (1:N — v2)
```

---

## Authorization Model

### Decision: Postgres RLS as the Single Authorization Layer

All access control lives in Postgres RLS policies. The frontend never enforces rules — it's defense in depth. The Supabase JWT is the auth context that RLS uses.

### Auth Flow: Magic Link + Anonymous Join

```
MAGIC LINK (returning members with email)
─────────────────────────────────────────
User → enters email
     → Server Action: supabase.auth.signInWithOtp({ email })
     → Email sent with 6-digit OTP or link
     → User clicks link / enters code
     → Server Action: supabase.auth.verifyOtp({ email, token, type: 'email' })
     → Supabase sets session (JWT stored in cookie)
     → Redirect to trip or dashboard

INVITE BY LINK (first-time / frictionless join)
──────────────────────────────────────────────
Group creator → copies trip URL: /join/{invite_token}
Invited friend → opens URL (no account needed)
              → Server Action: supabase.auth.signInAnonymously()
              → Anonymous user created (authenticated role, is_anonymous=true in JWT)
              → Server Action: join_trip(trip_id, invite_token)
                  → validates invite_token matches trips.invite_token
                  → inserts trip_members row (trip_id, anon_user_id, role: 'member')
              → Redirect to trip
              → [Optional later] User clicks "Guardar mi acceso"
                  → supabase.auth.updateUser({ email })
                  → OTP sent → verified → anonymous user promoted to permanent
```

### RLS Policy Design

**Security Definer Function (avoids recursion and improves perf):**
```sql
CREATE OR REPLACE FUNCTION is_trip_member(check_trip_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members
    WHERE trip_id = check_trip_id
    AND user_id = (SELECT auth.uid())
  );
$$;
```

**Trips table:**
```sql
-- Members can see their trips
CREATE POLICY "Members can view their trips"
ON trips FOR SELECT USING (is_trip_member(id));

-- Creator can update
CREATE POLICY "Creator can update trip"
ON trips FOR UPDATE USING (created_by = (SELECT auth.uid()));
```

**Documents table:**
```sql
-- Any member can read documents in their trips
CREATE POLICY "Members can view trip documents"
ON documents FOR SELECT USING (is_trip_member(trip_id));

-- Any member can upload documents
CREATE POLICY "Members can upload documents"
ON documents FOR INSERT WITH CHECK (is_trip_member(trip_id));
```

**Itinerary items:**
```sql
-- Any member can view and edit itinerary
CREATE POLICY "Members can view itinerary"
ON itinerary_items FOR SELECT USING (is_trip_member(trip_id));

CREATE POLICY "Members can add/edit itinerary"
ON itinerary_items FOR ALL USING (is_trip_member(trip_id));
```

**Invite link (anonymous pre-join access via RPC, not direct table):**
```sql
-- Get trip info by invite token without being a member yet
CREATE OR REPLACE FUNCTION get_trip_by_invite(token uuid)
RETURNS trips LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM trips WHERE invite_token = token LIMIT 1;
$$;
```

**Supabase Storage RLS (bucket: `trip-documents`):**
```sql
-- Allow members to download documents for their trips
CREATE POLICY "Members can read trip files"
ON storage.objects FOR SELECT USING (
  bucket_id = 'trip-documents'
  AND is_trip_member((storage.foldername(name))[1]::uuid)
);
```

---

## Data Flows

### 1. Auth Flow (Magic Link)

```
Browser                 Next.js Server Action       Supabase Auth
──────                  ─────────────────────       ─────────────
[Enter email]
        ──signInWithOtp(email)──────────────>
                                          <── 200 OK
        <── "Email sent" UI update
[User clicks email link]
[/auth/callback?token=...]
        ──verifyOtp(email, token)──────────>
                                          <── session JWT (in cookie)
        <── redirect to /trip or /dashboard
[All subsequent requests carry JWT cookie]
[RLS uses auth.uid() from JWT]
```

### 2. Upload Flow (Document Vault)

```
Browser                 Next.js Server Action       Supabase Storage
──────                  ─────────────────────       ────────────────
[Select PDF/image]
        ──getSignedUploadUrl(tripId, filename)──>
           (validates user is trip member)
                                               <── {signedUrl, token, path}
        ──PUT file directly to signedUrl──────────────────────────────>
                                               <── 200 OK
        ──insertDocumentRecord(tripId, path)──>
           (Server Action writes to documents table)
                                               <── document row created
        <── document appears in vault UI
```

Direct-to-storage pattern: The file bytes never pass through Next.js server — Vercel has a 4.5MB body limit on serverless functions. Signed upload URL bypasses this entirely. Supabase Storage v3 supports resumable uploads for large files (50GB limit).

### 3. Sync Flow (Offline → Online Reconnect)

```
OFFLINE STATE
─────────────
[User opens document while offline]
Service Worker (Cache-First)
        ── hit: IndexedDB blob cache
        <── document renders from cache

[User edits itinerary while offline]
React component
        ── writes to IndexedDB mutation queue
           { action: 'insert', table: 'itinerary_items', payload: {...}, queued_at }
        <── optimistic UI update

RECONNECT EVENT (navigator.onLine = true)
─────────────────────────────────────────
sync.ts watches navigator.onLine
        ── reads mutation queue from IndexedDB
        ── replays mutations to Supabase (in order)
        ── on conflict (409): last-write-wins (server timestamp wins)
        ── on success: removes item from queue
        ── BroadcastChannel.postMessage('sync-complete') → tabs re-fetch
```

**Conflict strategy:** Last-write-wins using server `updated_at` timestamp. This is appropriate for SharedTrip because:
- Itinerary edits are infrequent and usually by one person at a time
- CRDT complexity is not justified for a personal circle app
- Conflicts are rare; when they occur, newest server state wins and is acceptable

### 4. Realtime Collaboration Flow (Itinerary Updates)

```
Member A (editing)                  Supabase Realtime        Member B (viewing)
──────────────────                  ─────────────────        ──────────────────
[Adds itinerary item]
        ── INSERT itinerary_items ──>
                                   ── postgres_changes ──>
                                      (event: INSERT,
                                       table: itinerary_items,
                                       record: {...})
                                                            [useItinerarySync hook]
                                                            <── receives event
                                                            <── React state updated
                                                            [Item appears instantly]
```

**Implementation pattern:**
```typescript
// lib/realtime/useItinerarySync.ts
const channel = supabase
  .channel(`trip-${tripId}-itinerary`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'itinerary_items',
    filter: `trip_id=eq.${tripId}`,
  }, (payload) => {
    // Update local React state with payload.new / payload.old
  })
  .subscribe()
```

Note: Supabase Realtime `postgres_changes` requires the table to have RLS enabled and the user's JWT must pass the SELECT policy for realtime to deliver the event. Enable Realtime on `itinerary_items` table in Supabase dashboard.

---

## Offline-First Strategy

### Cache Layers and What Goes Where

| Data Type | Cache Layer | Strategy | Reason |
|-----------|-------------|----------|--------|
| App shell (HTML/JS/CSS) | Service Worker Cache API (precache) | Cache-first, update on build | Never changes between deploys |
| Document files (PDF/images) | IndexedDB blob store + Cache API | Cache-first, cache on first access | Core pain point: offline access at airport |
| Trip metadata (name, dates, members) | IndexedDB object store | Network-first, fallback to cache | Small data, needs to be current |
| Itinerary items | IndexedDB + Realtime | Network-first for reads, optimistic write | Changed frequently by group |
| Realtime updates (WS) | Not cached | Drop when offline | WebSocket not cacheable; reconnect on return |

### What Is Explicitly NOT Cached

- Auth sessions (managed by Supabase cookie, not service worker)
- Expense calculations (v1.5, deferred)
- Map tile data (v2, deferred — use lazy load at that phase)

### Service Worker Setup (Serwist)

```typescript
// next.config.ts
import withSerwist from '@serwist/next'

const withSerwistConfig = withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})

// app/sw.ts
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry } from 'serwist'
import { Serwist } from 'serwist'

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: /\/trip\/.*\/documents/,
      handler: 'CacheFirst',
      options: { cacheName: 'trip-documents', expiration: { maxEntries: 200 } },
    },
    {
      matcher: /supabase\.co\/storage/,
      handler: 'CacheFirst',
      options: { cacheName: 'document-files', expiration: { maxAgeSeconds: 604800 } },
    },
    {
      matcher: /supabase\.co\/rest/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-data', networkTimeoutSeconds: 3 },
    },
  ],
})
```

### IndexedDB Schema

```typescript
// lib/offline/db.ts
import { openDB } from 'idb'

export const db = openDB('sharedtrip-offline', 1, {
  upgrade(db) {
    // Cached document blobs
    const docStore = db.createObjectStore('documents', { keyPath: 'id' })
    docStore.createIndex('trip_id', 'trip_id')

    // Cached trip data
    db.createObjectStore('trips', { keyPath: 'id' })

    // Offline mutation queue
    const queue = db.createObjectStore('mutation_queue', {
      keyPath: 'id', autoIncrement: true
    })
    queue.createIndex('queued_at', 'queued_at')
  },
})
```

---

## PWA Installability

### Manifest Requirements

Next.js 15 has built-in App Router manifest support. Two required icons (192x192 and 512x512 PNG) must be in `public/`. The manifest must be served over HTTPS (Vercel provides this automatically).

```typescript
// app/manifest.ts
export default function manifest() {
  return {
    name: 'SharedTrip — Viajes en grupo',
    short_name: 'SharedTrip',
    description: 'Organiza tu viaje grupal sin perder nada',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#6366f1',
    lang: 'es',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

### iOS Install Note

iOS Safari does not fire `beforeinstallprompt`. Use an `InstallPrompt` component that detects iOS (`/iPad|iPhone|iPod/.test(navigator.userAgent)`) and shows manual "Add to Home Screen" instructions in Spanish. Show only when not already in standalone mode (`window.matchMedia('(display-mode: standalone)').matches`).

---

## Architectural Patterns

### Pattern 1: Server Actions as Auth/Security Boundary

**What:** All operations that touch service role key or generate tokens live in Next.js Server Actions (`'use server'`). Frontend only calls these — never holds sensitive keys.

**When to use:** Invite token generation, signed upload URL creation, OTP verification.

**Why:** Server Actions run on Vercel edge/serverless. The service role key never ships to the browser. Signed upload URLs are short-lived (default 60 seconds) and single-use.

### Pattern 2: Trip-Scoped Storage Buckets

**What:** All documents live under `trip-documents/{tripId}/{filename}` path structure. RLS on `storage.objects` uses the path prefix to check membership.

**Why:** Avoids per-user buckets (complex for group sharing). The single `trip-documents` bucket with folder-per-trip pattern aligns with Supabase Storage RLS folder helper (`storage.foldername()`).

### Pattern 3: Optimistic UI with Offline Queue

**What:** Itinerary adds/edits update React state immediately (optimistic), then write to Supabase. If offline, write to IndexedDB queue; replay on reconnect.

**When to use:** Any mutation that doesn't require server-validated uniqueness (itinerary items, notes). Not for document uploads (file must actually reach storage).

**Trade-offs:** Occasional brief desync if the server rejects (rare for itinerary). Acceptable for personal circle app.

### Pattern 4: Anonymous-First → Optional Upgrade

**What:** Invited users get an anonymous Supabase session on join (no email required). They can see and contribute to the trip immediately. Later, they can save their access by adding email (upgrades anonymous user to permanent).

**Why:** Eliminates the "create an account to see the ticket" friction that kills group adoption. The PROJECT.md explicitly requires no forced signup.

---

## Anti-Patterns

### Anti-Pattern 1: Sending File Bytes Through Next.js Server

**What people do:** Upload handler in a Next.js API route that receives the file, then forwards to storage.

**Why it's wrong:** Vercel serverless functions have a 4.5MB request body limit. A single PDF or boarding pass image can easily exceed this. Also adds latency (double-hop).

**Do this instead:** Generate a signed upload URL server-side (Server Action), return it to the browser, upload directly from browser to Supabase Storage. The signed URL is short-lived (60s) and single-use.

### Anti-Pattern 2: RLS Policy Using Direct Join on Membership Table

**What people do:**
```sql
CREATE POLICY "..." ON documents FOR SELECT USING (
  trip_id IN (SELECT trip_id FROM trip_members WHERE user_id = auth.uid())
);
```

**Why it's wrong:** This inline subquery runs for every row checked. On large tables it causes N+1 performance issues. Also risks infinite recursion if the membership table itself has RLS.

**Do this instead:** Use a `SECURITY DEFINER` function (`is_trip_member`) that bypasses RLS for the membership check and is called by all policies. Postgres can cache the function result within a transaction.

### Anti-Pattern 3: Caching Auth State in Service Worker

**What people do:** Service worker intercepts auth token requests, caches JWT in Cache API.

**Why it's wrong:** JWTs expire. Cached expired tokens cause silent auth failures when offline. Supabase handles session refresh via cookies automatically.

**Do this instead:** Let Supabase middleware handle session refresh (`lib/supabase/middleware.ts`). Never cache auth endpoints in service worker. Only cache document storage URLs.

### Anti-Pattern 4: Single Shared Invite Token Without Rotation

**What people do:** Hardcode a static invite link forever (e.g., `/join/abc123`).

**Why it's wrong:** If the link leaks (forwarded by a group member), anyone can join. No way to invalidate without breaking everyone's link.

**Do this instead:** Generate `invite_token` as a UUID per trip. Add a Server Action to regenerate the token if the trip creator wants to revoke access. Old tokens stop working immediately.

---

## Build Order / Dependency Graph

The architecture creates a hard dependency chain. Phases must respect this order:

```
1. INFRASTRUCTURE (blocks everything)
   Supabase project → Auth config → DB schema → RLS policies → Storage bucket

2. AUTH (blocks trip access)
   Magic link flow → Session middleware → Anon sign-in → Invite join flow

3. TRIP CORE (blocks documents and itinerary)
   Trip creation → Invite token → trip_members → Trip detail page

4. DOCUMENT VAULT (core value, unblocked after trip + auth)
   Upload flow (signed URL) → Document list → Download → Service worker cache

5. ITINERARY (collaborative, unblocked after trip core)
   CRUD items → Realtime subscription → Offline optimistic queue

6. PWA SHELL (can layer on at any phase, but needed before v1 ships)
   Manifest → Service worker (Serwist) → Install prompt → Offline banner

7. EXPENSES (v1.5 — unblocked after trip_members stable)
   Expense model → Split calculation → Balance view

8. MAP (v2 — independent of expenses, unblocked after trip core)
   Location model → Map embed (Mapbox/Leaflet) → Pin CRUD
```

**Critical path for v1 (< 1 month deadline):**
`Infrastructure → Auth → Trip Core → Document Vault → PWA Shell`

Itinerary is table stakes but can ship without realtime (polling fallback) if time is tight. Realtime is an enhancement, not a blocker.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `supabase.auth.*` client SDK + Server Action wrappers | Magic link OTP + anonymous sign-in |
| Supabase Storage | Signed upload URL (server-generated) → direct browser upload | Never proxy files through Next.js |
| Supabase Realtime | Client-side `supabase.channel().on('postgres_changes')` | Only for itinerary_items in v1 |
| Vercel | Git push → auto deploy; edge functions for middleware | No special config needed for Next.js |
| Email provider | Supabase built-in SMTP (free tier) for magic link emails | Custom SMTP (Resend) if deliverability issues arise |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Browser ↔ Supabase DB | Supabase JS SDK (RLS-enforced) | All reads/writes go through SDK, RLS is the guard |
| Browser ↔ Supabase Storage | Signed URL (short-lived, direct) | Server Action generates URL, browser uploads |
| Browser ↔ Supabase Realtime | WebSocket channel subscription | Drop gracefully on offline; reconnect auto |
| Service Worker ↔ Browser Tabs | BroadcastChannel API | Notify tabs when sync queue is flushed |
| Next.js Server ↔ Supabase | Service role client in Server Actions only | Never in `'use client'` components |

---

## Scaling Considerations

| Scale | Architecture Notes |
|-------|--------------------|
| 0–50 users (v1 personal circle) | Supabase free tier covers it; no changes needed |
| 50–500 users | Supabase Pro tier; add connection pooling (PgBouncer, already in Supabase); monitor storage quota |
| 500–5k users | Upgrade Supabase compute; consider CDN for document files (Cloudflare R2 or Supabase CDN); add rate limiting on invite joins |
| 5k+ users | Beyond current scope; would require custom infra decisions |

**First bottleneck:** Supabase free tier has 500MB DB and 1GB storage. For a personal circle app, this will not be hit. If open to the public, storage fills first (PDF uploads). Add file size limit (10MB per doc) to stay within budget.

---

## Sources

- [Next.js PWA Guide (official, updated 2026-05-28)](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Passwordless Email Logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Storage: Upload to Signed URL](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl)
- [Supabase Realtime Concepts](https://supabase.com/docs/guides/realtime/concepts)
- [RLS for Team Invite System — Boardshape Engineering](https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase)
- [Next.js 16 PWA with Offline Support — LogRocket](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Offline-First PWA with Serwist — DEV Community](https://dev.to/sukechris/building-offline-apps-with-nextjs-and-serwist-2cbj)
- [Supabase Auth + RLS Complete Guide — DEV Community](https://dev.to/kanta13jp1/supabase-auth-complete-guide-oauth-magic-link-row-level-security-4kjc)
- [Signed URL File Uploads with Next.js and Supabase — Medium](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0)

---

*Architecture research for: SharedTrip — Group Trip PWA (Spanish-first, offline-first document vault)*
*Researched: 2026-05-29*
