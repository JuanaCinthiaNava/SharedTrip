# SharedTrip

## What This Is

SharedTrip es una webapp PWA en español, hub central para organizar viajes y eventos grupales. Cada viaje vive en un link compartible — sin descargas, sin fricción para invitar — donde el grupo guarda boletos, itinerario, gastos y ubicaciones de forma estructurada, en lugar de perderlos en chats de WhatsApp y screenshots. Construida inicialmente para uso personal con un círculo cercano.

## Core Value

**Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.** Si esto falla, la app falla. Todo lo demás (itinerario, gastos, mapa) es valor incremental sobre esta bóveda confiable.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**v1 — Lo que debe estar listo antes del próximo viaje (< 1 mes)**

- [ ] Crear evento/viaje con nombre, fechas y descripción básica
- [ ] Invitar miembros vía link compartible (magic link auth)
- [ ] Bóveda de documentos: subir PDFs, imágenes de boletos, códigos de reservación, accesibles por todos los miembros
- [ ] Acceso offline a documentos guardados (PWA con cache)
- [ ] Itinerario simple: lista cronológica de actividades con fecha/hora/lugar
- [ ] UI en español, estilo juvenil y vibrante (referencia: Spotify, Duolingo)
- [ ] Responsive web (móvil-first, funciona en laptop)
- [ ] Instalable como PWA en pantalla principal

**v1.5 — Durante/después del viaje (validación en uso real)**

- [ ] Gastos divididos: registrar quién pagó qué, balances por miembro, settle-up

**v2 — Iteración post-viaje**

- [ ] Mapa con ubicaciones guardadas (hotel, restaurantes, atracciones marcadas geográficamente)

### Out of Scope

- **Chat dentro de la app** — WhatsApp ya hace eso. No reinventamos mensajería.
- **Red social / feed público** — Es privado al grupo. Sin follows, likes, ni descubrimiento.
- **Buscar/reservar vuelos u hoteles** — No competimos con Booking/Despegar/Kayak. Solo organizamos info que el grupo ya tiene.
- **Forzar signup para ver contenido** — Quien tiene el link debe poder ver al menos lo básico (con auth ligera tipo magic link, sin contraseñas).
- **App nativa iOS/Android** — PWA cubre las necesidades del MVP. Reduce ambición y costo de mantenimiento.
- **Multi-idioma (i18n)** — Solo español en v1. El círculo objetivo es hispanohablante. i18n se añade si hay demanda real.

## Context

- **Trigger del proyecto:** El último viaje real del usuario tuvo el pain point más fuerte al buscar el PDF/screenshot del boleto y código de reservación cuando se necesitaba (típicamente en aeropuerto, sin tiempo, a veces sin internet). Esta es la herida que justifica construir algo nuevo a pesar de Notion/TripIt/Splitwise existiendo.
- **Por qué no Notion/TripIt/WhatsApp:** Notion es frío y no tiene auth grupal frictionless. TripIt está orientado a vuelos individuales (USA), no a grupos. WhatsApp pierde información estructurada en el ruido. Ninguna ofrece bóveda offline-first de documentos atada a un evento grupal.
- **Usuario objetivo:** "Yo y mi círculo cercano" — adultos jóvenes (20-35), hispanohablantes, con experiencia previa en organizar viajes grupales. Móvil-first, esperan UX moderna.
- **Validación esperada:** El próximo viaje del usuario actúa como primer test real. Si los miembros del grupo lo abren más de una vez sin que el creador lo pida, hay señal positiva.
- **Ambición:** Proyecto personal de aprendizaje. Sin plan de monetización. Sin presión de escalar — éxito = utilidad real para el círculo cercano.

## Constraints

- **Timeline**: v1 debe estar funcional antes del próximo viaje (< 1 mes desde hoy, 2026-05-29) — Hay deadline real, no aspiracional.
- **Plataforma**: Web responsive + PWA — Cero fricción para invitar al grupo (sin descargas de app stores).
- **Idioma**: Solo español en UI — Reduce overhead de i18n; el círculo objetivo es hispanohablante.
- **Hosting**: Cloud serverless con tier gratuito alcanzable — Personal project, sin presupuesto operativo.
- **Auth**: Magic link / passwordless — Cero contraseñas, mínima fricción para amigos.
- **Offline**: La bóveda de documentos debe funcionar sin internet — Pain point crítico (aeropuertos, roaming caro).
- **Solo dev**: Una persona construyendo en tiempo limitado — Stack debe optimizar velocidad de iteración, no robustez enterprise.
- **Stack moderno 2026**: Sin apego previo a tecnología — La investigación define recomendación óptima (probable: Next.js + Supabase + Vercel + Tailwind, a confirmar).
- **Privacidad**: Boletos contienen información personal (nombre, código de boleto, código QR) — Acceso restringido a miembros del evento. Sin compartir datos a terceros.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web PWA en lugar de nativa | Cero fricción para invitar; cubre offline con service worker | — Pending |
| Magic link auth | Cero contraseñas; UX moderna y baja fricción para el círculo objetivo | — Pending |
| Solo español en v1 | Círculo objetivo es hispanohablante; reduce overhead | — Pending |
| Bóveda de boletos como feature ancla | Pain point #1 del usuario; diferenciador real vs alternativas | — Pending |
| Diferir gastos a v1.5 y mapa a v2 | Timeline tight (<1 mes); priorizar lo que entrega valor en el viaje real | — Pending |
| Hosting serverless gratis | Sin presupuesto operativo; tier gratuito alcanza para círculo cercano | — Pending |
| NO incluir chat | WhatsApp ya cubre; reinventarlo es trampa de alcance | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-29 after initialization*
