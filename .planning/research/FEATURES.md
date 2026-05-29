# Feature Research

**Domain:** Group trip/event organization PWA — document vault, itinerary, expenses, maps
**Researched:** 2026-05-29
**Confidence:** MEDIUM-HIGH (competitors analyzed via official sources + multiple review sites; UX patterns cross-verified)

---

## Competitor Analysis Summary

| App | Primary Strength | Group Collab | Offline Docs | Expense Split | Core Gap |
|-----|-----------------|:------------:|:------------:|:-------------:|----------|
| TripIt | Auto-parse booking emails into chronological itinerary | No (read-only share) | No | No | Individual-only, US-centric |
| Wanderlog | Collaborative itinerary + map pins + voting | Yes (Google Docs-style) | No | Basic | Heavy, requires signup for all |
| Splitwise | Expense splitting UX (clear balances, settle-up) | Expenses only | No | Yes | No itinerary or documents |
| Roadtrippers | Road trip routing + discovery | Yes (editing) | Paid tier | No | Road-trip niche, English only |
| Polarsteps | Journey tracking + photo journal | Read-only followers | No | No | One editor only, no planning |
| Notion templates | Flexible, collaborative documents | Yes (manual) | Unreliable mobile | No | No structure, no offline, cold UX |
| WhatsApp + Drive | Communication + file storage | Yes (chat) | Drive = no | No | Information lost in noise, no structure |

**The gap SharedTrip exploits:** No single product combines frictionless group invite (link-based, no install), offline-first document access, and a structured itinerary in one mobile-first product aimed at Spanish-speaking friend groups. Most alternatives require everyone to create an account or are optimized for English-speaking solo travelers.

---

## Module 1: Document Vault

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Upload PDF + image files | Users store boarding passes, hotel confirmations, e-tickets as PDFs/JPGs/screenshots | S | Accept PDF, JPG, PNG, HEIC minimum |
| View uploaded file inline | Must be readable without downloading to a separate app | M | PDF.js for PDFs; native img for images |
| Offline access to cached documents | Pain point #1 from PROJECT.md — needed at airports/roaming | M | PWA Cache API + IndexedDB; cache-first strategy for document assets |
| All group members can access | The vault is shared — every trip member sees all docs | S | Row-level security on trip membership |
| File organized by trip | Each doc belongs to a trip, not floating in a global list | S | Simple trip_id foreign key grouping |
| Label/name each document | "Boleto Juan — AA 1234" vs untitled file | S | Editable title field on upload |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| Explicit "save for offline" per document | Users know exactly what's available offline vs cloud-only — honest transparency beats silent failures | M | Sync indicator + manual "pin offline" toggle; browser storage quotas must be handled gracefully |
| Upload directly from camera/gallery | On mobile, most tickets start as screenshots — camera roll picker reduces friction vs file manager | S | `<input accept="image/*,application/pdf" capture="environment">` |
| QR code display full-screen | Boarding pass/hotel QR needs to fill screen for scanner — zoom-to-fit on tap | S | High impact, very low cost to implement |
| Document category tagging | "Vuelo / Hotel / Actividad / Otro" makes scanning a 6-doc vault fast | S | Simple enum; not a taxonomy, just 4-5 tags |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| Auto-parse booking confirmation emails | TripIt's flagship feature — users find it magical | OAuth email access creates security/privacy concern for a personal-circle product; implementation cost is L; scope creep for v1 timeline | Manual upload is the right default for a small group; revisit only if upload friction is proven in real use |
| Version history / audit trail for documents | Power users want "who uploaded what when" | Adds database + UI complexity with near-zero value for 5-person friend trip | Show uploader name + timestamp, no versioning |
| Document expiration / reminders | "Alert me when boarding pass day arrives" | Notification infrastructure is M complexity for a feature users get from airline apps already | Out of scope; link to Google Calendar instead |
| Encrypted at-rest per user key | Security-conscious users may ask for this | Supabase RLS provides adequate access control for personal use; per-user encryption requires key management that breaks offline access | Standard HTTPS + RLS is the right security model here |

---

## Module 2: Itinerary

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Chronological event list | The mental model for a trip IS a timeline — day 1, then day 2, then day 3 | S | Group by date header; sort by datetime |
| Add event: name + date/time + place | Minimum viable event: "Vuelo a CDMX · 15 jun 07:30 · Aeropuerto T2" | S | Three required fields; place as free text in v1 |
| All group members can view itinerary | The itinerary is shared — everyone is on the same page | S | Same trip membership gate as vault |
| Edit / delete events (trip creator or all members?) | Plans change — flight delayed, activity cancelled | S | Recommend: all members can edit in v1 (trust-based small group) |
| Empty state with clear CTA | New trip with zero events must guide toward adding first event | S | "Agrega el primer plan del viaje" with big + button |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| Link itinerary event to a document | "Ver boleto" button on the flight event — closes the vault/itinerary gap | M | Optional document_id foreign key on event; surface as attachment chip |
| Day-grouped collapsible view | Multi-day trips get long fast — collapsing past days reduces cognitive load | S | Date-bucketed groups with expand/collapse toggle |
| "Happening now" or "next up" highlight | Surfaces the most immediately relevant event without scrolling | S | Simple: compare event datetime to now; style the nearest future event distinctly |
| Offline itinerary access | Less critical than documents but still useful at destination | M | Cache itinerary JSON in IndexedDB alongside documents |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| Drag-and-drop reordering | Power UX pattern from Wanderlog — feels slick | Time vs chronological sort means D&D is redundant (event datetime determines order); implementing D&D on mobile is fragile | Just sort by datetime; edit the time field to reorder |
| Voting / polling on activities | "Should we go to the beach or the museum?" | Democratic decision tools require async state, notifications, and quorum logic — L complexity; WhatsApp handles this adequately | Out of scope; this is a coordination tool not a planning tool |
| AI-generated itinerary suggestions | "Plan my Mexico City trip" | Requires LLM API, hallucination risk, scope inflation — v1 is about organizing what the group already decided | Add to wishlist; validate real need first |
| Per-event RSVP / attendance tracking | Who's coming to which activity | Adds member-state complexity; for a 5-person friend group this creates unnecessary formality | WhatsApp poll is fine for this |

---

## Module 3: Expense Splitting (v1.5)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Log an expense: amount + who paid + who owes | Core record — "Juan pagó $850 por la cena, todos deben" | S | Payer field + equal split by default |
| Running balance per member | "Cuánto le debo a María" — this is the product, not the expense list | M | Derive balances from expense ledger in query |
| Settle-up suggestion | "Para saldar: tú le das $230 a Juan" — minimizes transfers | M | Debt simplification algorithm (greedy or Hungarian); Splitwise's "Simplify Debts" is the canonical pattern |
| Multi-currency support | International trips (MXN + USD + EUR) are common for target users | M | Store amount + currency_code; display in original; convert for balance summary using stored exchange rate at time of entry |
| Offline expense logging | No signal at a beach restaurant — log now, sync later | M | Queue in IndexedDB, sync when online |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| Expense linked to itinerary event | "Cena en La Docena · 15 jun" — expense has context, not just a dollar amount | S | Optional event_id FK on expense; massive clarity gain, minimal code |
| Photo receipt attachment | Resolves disputes about what was actually ordered | M | Reuses document upload infrastructure |
| Equal vs unequal split toggle | "Solo fuimos 4 a ese tour" — not everyone split every expense | S | Default equal; unlock custom amounts when toggled |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| In-app payment (Venmo/PayPal transfer) | Closes the loop — no chasing people via text | Payments require financial licensing, PCI compliance, regional payment provider integrations — disproportionate risk and cost for a personal project | Show settle-up amounts; users transfer via their preferred method outside the app |
| Recurring / subscription expenses | Edge case for multi-week trips | Not relevant to weekend/week trip use case | Out of scope |
| Budget planning / budget limits | Pre-trip budgeting feature | Different workflow from tracking; adds projection state; Wanderlog does it; v1.5 should focus on recording reality, not planning hypotheticals | Defer to v2 if usage signals demand it |

---

## Module 4: Map (v2)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Pin saved locations on map | Visual overview of where hotel, restaurants, and activities are relative to each other | M | Mapbox or Google Maps embed; pin from itinerary place field |
| Tap pin to see details | What is this place? Link to itinerary event, address, notes | S | Modal/sheet with event data |
| Cluster pins when zoomed out | Dense destination with 20 pins becomes unreadable | M | Mapbox clustering is built-in |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| Map auto-populated from itinerary places | No manual re-entry — if a place is in the itinerary, it appears on the map | M | Geocode place text from itinerary events; requires geocoding API |
| Offline map tiles for destination area | Downloaded tiles for the city the group is visiting | L | Large storage footprint; requires tile caching strategy; revisit only if offline docs feedback proves strong demand for offline maps too |
| Group member location sharing | "Where is everyone right now?" | L | Real-time presence requires websockets + consent + battery drain; high complexity, high privacy surface — do NOT build |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| Real-time group member location sharing | Groups actually want this during the trip | Privacy surface is large; battery drain; real-time infra; moral hazard (surveillance among friends) | Explicit out-of-scope; recommend WhatsApp "share location" for live tracking |
| Discover/recommend nearby places | "What should we do near here?" | Requires POI database or third-party API; becomes a Yelp/Google Maps clone; not the product's job | Deep link to Google Maps search for the area instead |
| Route / navigation | Turn-by-turn between pins | Google Maps / Waze own this definitively | Deep link to Google Maps directions |

---

## Cross-Cutting Features (All Modules)

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|-----------|-------|
| Trip creation: name + dates + cover | The container everything lives in | S | Name (required), start/end date, optional cover photo/emoji |
| Invite via shareable link | No install, no signup required to join — PROJECT.md core constraint | M | Signed invite token in URL; magic link creates account + joins trip atomically |
| Member list visible to all | "Who's on this trip" — trust signal | S | Avatar + name list in trip header |
| PWA install prompt | "Add to home screen" reduces return-visit friction | S | Standard web manifest + beforeinstallprompt event |
| Spanish UI | Target audience is Spanish-speaking; UX must feel native not translated | S | All copy, labels, errors, empty states in Spanish from day one — not a translation layer |
| Mobile-first responsive | Most usage is on phones, especially during the trip | S | Tailwind mobile breakpoints; test on 375px viewport as primary |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|------------------|-----------|-------|
| View-only access for link holders without account | Someone can see the itinerary without signing up — lowers adoption barrier for passive group members | M | Public read token vs member write token; two tiers of link |
| Vibrant, non-corporate visual design | Competitors (TripIt, Notion) feel like productivity tools; target users (20-35) expect Spotify/Duolingo energy | M | Design system with bold colors, trip cover art, custom empty states — not just Tailwind defaults |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|--------------|----------------|-------------|
| In-app chat | "Everything in one place" | WhatsApp already owns this behavior for Spanish-speaking friend groups; building a chat that people will abandon for WhatsApp anyway wastes L of effort | Explicit PROJECT.md decision; reinforce with "Abrir WhatsApp" deep link |
| Social discovery / public trips | "Share your itinerary publicly" | Expands scope to social network; documents contain personal data (names, QR codes); privacy risk for personal-circle product | Private by default; sharing is invite-only |
| Push notifications | "Alert me about trip updates" | Notification permission fatigue; complex to implement reliably across iOS PWA (limited support); adds infra; low value for small group where WhatsApp handles communication | Badge on PWA icon via Badging API if needed; no push in v1 |
| Multi-language support | Future growth | Adds overhead to every copy change; target users are uniformly Spanish-speaking | Defer; add only when non-Spanish users demonstrate real usage |

---

## Feature Dependencies

```
[Trip Creation]
    └──required by──> [Document Vault]
    └──required by──> [Itinerary]
    └──required by──> [Expense Splitting]
    └──required by──> [Map]

[Magic Link Auth + Invite]
    └──required by──> [Trip Creation] (who owns it)
    └──required by──> [Member list]

[Document Upload]
    └──enhances──> [Itinerary Event] (via document attachment)
    └──enhances──> [Expense Entry] (via receipt attachment)

[Itinerary Place Field]
    └──required by──> [Map pins] (geocoded from place text)

[Offline Cache (Service Worker)]
    └──required by──> [Offline Document Access]
    └──required by──> [Offline Itinerary Access]
    └──required by──> [Offline Expense Logging]

[Expense Splitting]
    └──enhances──> [Itinerary Event] (expense linked to event)
    └──independent of──> [Document Vault] (can be built separately in v1.5)

[Map]
    └──requires──> [Itinerary] (to have places to pin)
    └──independent of──> [Document Vault]
    └──independent of──> [Expense Splitting]
```

### Dependency Notes

- **Trip Creation requires Magic Link Auth:** A trip has an owner; ownership requires identity. Auth must be wired before any trip-scoped data can be created.
- **Document Upload enhances Itinerary:** The "link a document to an event" feature requires both modules to exist. Build as an optional enhancement in Phase 2 after both ship independently.
- **Offline Cache is infrastructure, not a feature:** All three offline experiences (docs, itinerary, expenses) share the same service worker + IndexedDB layer. Build this infrastructure once in Phase 1 for documents; extending to itinerary data is incremental.
- **Map requires Itinerary places:** The map has nothing to show until itinerary events with place data exist. Correct deferral to v2.

---

## MVP Definition

### Launch With (v1) — Before the next trip

- [x] Trip creation with name, dates, description — the container
- [x] Magic link invite — frictionless group join, core differentiator
- [x] Document vault: upload PDF/image, view inline, label, organize by trip
- [x] Offline document access — the #1 pain point; if this fails, the product fails
- [x] Itinerary: add/edit/delete events with date, time, place; chronological list
- [x] Spanish UI throughout
- [x] PWA installable on home screen
- [x] Mobile-first responsive

### Add After Validation (v1.5) — During/after first real trip

- [ ] Expense splitting: log expenses, running balances, settle-up suggestion — trigger: group members use the vault in the real trip and encounter money awkwardness
- [ ] Expense linked to itinerary event — makes expenses feel contextual, not financial admin
- [ ] Multi-currency — trigger: any international trip in the group
- [ ] Offline expense logging — extends existing service worker infrastructure

### Future Consideration (v2+) — Post first trip

- [ ] Map with pins auto-populated from itinerary places — trigger: itinerary has accumulated enough places that geographic overview adds value
- [ ] Document-to-event linking in itinerary view — trigger: vault and itinerary both have real content and users express "I want to see the ticket from this event" behavior
- [ ] QR code full-screen display — high value, very low effort; bump to v1 if there's spare capacity
- [ ] View-only link tier (no account required) — defer if invite friction is not observed in real use

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|:----------:|:-------------------:|:--------:|
| Document upload + view | HIGH | M | P1 |
| Offline document access | HIGH | M | P1 |
| Itinerary CRUD (chronological) | HIGH | S | P1 |
| Magic link invite | HIGH | M | P1 |
| Trip creation | HIGH | S | P1 |
| Spanish UI | HIGH | S | P1 |
| PWA install | MEDIUM | S | P1 |
| Camera/gallery upload shortcut | MEDIUM | S | P1 |
| QR full-screen display | HIGH | S | P1 (zero cost, high moment-of-need value) |
| Document labeling + category tag | MEDIUM | S | P1 |
| Day-grouped itinerary view | MEDIUM | S | P1 |
| "Next up" event highlight | MEDIUM | S | P2 |
| Offline itinerary access | MEDIUM | M | P2 |
| Expense splitting core | HIGH | M | P2 (v1.5) |
| Settle-up algorithm | HIGH | M | P2 (v1.5) |
| Expense-to-event linking | MEDIUM | S | P2 (v1.5) |
| Multi-currency | MEDIUM | M | P2 (v1.5) |
| Map with pins | MEDIUM | M | P3 (v2) |
| Map auto-populate from itinerary | MEDIUM | M | P3 (v2) |
| View-only link tier | MEDIUM | M | P3 |
| Voting / group decisions | LOW | L | Never (use WhatsApp) |
| In-app chat | LOW | L | Never (PROJECT.md explicit) |
| Email auto-parse | LOW | L | Never (privacy + complexity) |
| In-app payments | LOW | L | Never (licensing risk) |
| Real-time location sharing | LOW | L | Never (privacy + complexity) |

**Priority key:**
- P1: Must have for v1 launch (next trip deadline)
- P2: Add in v1.5 or when validated
- P3: Deferred to v2 or later

---

## Sources

- [TripIt Documents Feature (official)](https://help.tripit.com/en/support/solutions/articles/103000063395-travel-documents-)
- [Best Group Travel Planning Apps 2026 — TripProf](https://tripprof.com/en/blog/best-group-travel-planning-apps/)
- [Wanderlog Review: 2025 Detailed Look — Wandrly](https://www.wandrly.app/reviews/wanderlog)
- [Wanderlog: The Travel App — WhistleOut](https://www.whistleout.com/CellPhones/Guides/wanderlog-group-trip-planning-app)
- [Splitwise UX Case Study — UX Collective](https://uxdesign.cc/splitwise-a-ux-case-study-dc2581971226)
- [Splitwise UX Case Study — Bootcamp / Medium](https://medium.com/design-bootcamp/splitwises-ux-e0afb602582e)
- [Polarsteps vs Roadtrippers comparison — SaaSHub](https://www.saashub.com/compare-polarsteps-vs-roadtrippers)
- [Trep Group Travel Planner UI/UX Case Study — Medium](https://medium.com/@rishabhranjan411/trep-the-all-in-one-mobile-group-travel-planner-mobile-app-ui-ux-case-study-9fd176f3a2ed)
- [Offline Storage for PWAs — LogRocket](https://blog.logrocket.com/offline-storage-for-pwas/)
- [PWA Offline Data — web.dev](https://web.dev/learn/pwa/offline-data/)
- [Magic Links UX, Security, and Growth — BayTech](https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025)
- [Best Group Trip Planning Tools 2026 — SquadTrip](https://squadtrip.com/guides/the-ultimate-group-travel-planning-app/)
- [5 Best Apps to Split Trip Expenses 2026 — Cino](https://www.getcino.com/post/split-trip-expenses)
- [Notion Travel Templates — PathPages](https://pathpages.com/blog/6-best-notion-travel-templates)

---
*Feature research for: SharedTrip — group trip/event organization PWA*
*Researched: 2026-05-29*
