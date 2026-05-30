# Requirements: SharedTrip

**Defined:** 2026-05-29
**Core Value:** Recuperar al instante el boleto/reservación correcto cuando lo necesitas — incluso sin internet.

## v1 Requirements

Requirements para el primer release usable antes del próximo viaje del usuario (<1 mes).

### Infrastructure & Setup

- [x] **INFRA-01**: Proyecto Supabase creado con DB Postgres, Auth, Storage y Realtime habilitados
- [x] **INFRA-02**: Esquema inicial con tablas `trips`, `trip_members`, `documents`, `itinerary_items`, `expenses` (esta última vacía, lista para v1.5)
- [x] **INFRA-03**: Row-Level Security (RLS) habilitada en todas las tablas, con función `is_trip_member(trip_id)` `SECURITY DEFINER`
- [x] **INFRA-04**: Bucket de Storage `trip-documents` privado, con políticas que solo permiten acceso a miembros del trip
- [x] **INFRA-05**: Keep-alive cron (GitHub Actions) hace ping a Supabase cada 5 minutos para evitar pausa por inactividad
- [x] **INFRA-06**: Deploy a Vercel con dominio funcional y variables de entorno seguras
- [x] **INFRA-07**: Diccionario `es.ts` para todas las strings de UI (no hardcoded JSX) — i18n-ready aunque solo se exponga español

### Authentication

- [x] **AUTH-01**: Usuario puede registrarse / iniciar sesión vía magic link enviado a su email
- [x] **AUTH-02**: Magic link email tiene subject único por request para evitar Gmail threading / clipping
- [x] **AUTH-03**: Sesión persiste entre refrescos del navegador y reinicios del dispositivo
- [x] **AUTH-04**: Usuario puede cerrar sesión desde cualquier pantalla
- [x] **AUTH-05**: Invitado puede unirse a un trip vía anonymous session (Supabase `signInAnonymously`) sin email
- [x] **AUTH-06**: Invitado anónimo puede upgrade a cuenta real (`updateUser({ email })`) conservando membresía a sus trips

### Trip Management

- [ ] **TRIP-01**: Usuario autenticado puede crear un trip con nombre, fechas (inicio/fin) y descripción opcional
- [ ] **TRIP-02**: Creador genera link de invitación compartible (con token único, sin expiración o expiración configurable)
- [ ] **TRIP-03**: Cualquiera con el link puede unirse al trip (después de auth o anonymous join)
- [ ] **TRIP-04**: Usuario puede ver la lista de trips a los que pertenece
- [ ] **TRIP-05**: Miembros del trip pueden ver la lista de los demás miembros (nombre, avatar/inicial)
- [ ] **TRIP-06**: Creador puede remover miembros del trip
- [ ] **TRIP-07**: Cualquier miembro puede salir del trip (excepto el creador, que debe transferir o eliminar el trip)
- [ ] **TRIP-08**: Creador puede editar nombre, fechas y descripción del trip
- [ ] **TRIP-09**: Creador puede archivar/eliminar un trip

### Document Vault (Core Value)

- [ ] **DOCS-01**: Miembro puede subir documentos (PDF, JPG, PNG, HEIC) al trip vía signed upload URL (cliente → Supabase Storage directo, sin pasar por server actions)
- [ ] **DOCS-02**: Documento tiene metadata editable: título, categoría (boleto, reservación, identificación, otro), miembro asociado opcional
- [ ] **DOCS-03**: Miembros del trip ven la lista de documentos, organizada por categoría y fecha de subida
- [ ] **DOCS-04**: Miembro puede ver/abrir un documento en pantalla completa (PDFs renderizables, imágenes ampliables)
- [ ] **DOCS-05**: Documentos descargados se cachean en IndexedDB (Dexie.js) para acceso offline persistente
- [ ] **DOCS-06**: Documento abierto previamente se abre instantáneamente sin red (offline-first)
- [ ] **DOCS-07**: Miembro puede eliminar documentos que él/ella subió; el creador del trip puede eliminar cualquiera
- [ ] **DOCS-08**: Tamaño máximo por archivo: 10 MB, con mensaje de error claro si se excede
- [ ] **DOCS-09**: Vista QR fullscreen — si un documento es imagen con código QR (o usuario marca como "boleto con QR"), botón "Mostrar QR" lo abre maximizado, brillo de pantalla al máximo
- [ ] **DOCS-10**: Indicador visual cuando documento no está disponible offline ("no descargado todavía")

### PWA & Offline

- [ ] **PWA-01**: Manifest.json válido con iconos, theme color, display standalone, idioma español
- [ ] **PWA-02**: Service worker (Serwist) cachea shell de la app (HTML, CSS, JS) para arranque instantáneo
- [ ] **PWA-03**: App es instalable en Home Screen en iOS y Android, con instrucciones contextuales si el usuario no la instala
- [ ] **PWA-04**: Solicitar `navigator.storage.persist()` después del primer documento subido para evitar eviction en iOS Safari (7 días)
- [ ] **PWA-05**: Indicador global de estado de red (online/offline) en la UI
- [ ] **PWA-06**: Si el SW se actualiza, mostrar prompt "Nueva versión disponible — recargar" sin romper sesión activa

### Itinerary

- [ ] **ITIN-01**: Miembro puede crear ítem de itinerario con: título, fecha, hora inicio (y fin opcional), lugar/ubicación texto libre, notas
- [ ] **ITIN-02**: Itinerario se muestra en vista cronológica agrupada por día
- [ ] **ITIN-03**: Miembro puede editar y eliminar ítems del itinerario
- [ ] **ITIN-04**: Cambios al itinerario se propagan en tiempo real a otros miembros conectados (Supabase Realtime `postgres_changes`)
- [ ] **ITIN-05**: Ítems del itinerario pueden referenciar uno o más documentos de la bóveda (ej. "vuelo Mex→Cdmx" → adjunta boleto PDF)

### UI & Localization

- [x] **UI-01**: Toda la interfaz en español neutro/LATAM, sin strings en inglés visibles
- [x] **UI-02**: Estilo visual juvenil y vibrante — paleta de colores saturada, ilustraciones/iconos cálidos, tipografía moderna (referencia: Spotify, Duolingo)
- [x] **UI-03**: Responsive móvil-first, funcional desde 320px hasta desktop
- [ ] **UI-04**: Estados de carga claros (skeletons), errores con mensaje accionable, vacíos con guía hacia siguiente acción
- [ ] **UI-05**: Fechas formateadas con `Intl.DateTimeFormat('es-MX')` consistentemente

## v1.5 Requirements

Activado tras validación de v1 en el primer viaje real. Tabla `expenses` ya migrada en Phase 1.

### Expenses

- **EXP-01**: Miembro puede registrar gasto con: monto, moneda, descripción, quién pagó, entre quiénes se divide
- **EXP-02**: Vista de balances por miembro (cuánto debe / le deben en neto)
- **EXP-03**: Vista de settle-up con sugerencia que minimiza el número de transferencias
- **EXP-04**: Miembro puede marcar gasto como "pagado" / "settled"
- **EXP-05**: Soporte para múltiples monedas con conversión manual (FX automático queda fuera)

## v2 Requirements

Iteración post-viaje. No prioritario.

### Map

- **MAP-01**: Miembro puede agregar ubicación a un ítem de itinerario (búsqueda + pin en mapa)
- **MAP-02**: Vista de mapa con todos los pins del trip
- **MAP-03**: Mapa funciona offline con tiles cacheados de la zona del trip
- **MAP-04**: Tap en pin lleva al ítem de itinerario relacionado

### Otros

- **OTHR-01**: Encuestas/votaciones grupales para decisiones (ej. "¿Cena el viernes en A o B?")
- **OTHR-02**: Notas grupales / "decisiones tomadas"
- **OTHR-03**: Notificaciones push (web push) para cambios importantes

## Out of Scope

Excluidos explícitamente — documentados para prevenir scope creep.

| Feature | Razón |
|---------|-------|
| Chat dentro de la app | WhatsApp ya cubre mensajería; reinventarlo es trampa de alcance |
| Feed público / red social | Es privado al grupo; sin follows, likes, descubrimiento |
| Buscar/reservar vuelos u hoteles | No competimos con Booking/Despegar; solo organizamos info que el grupo ya tiene |
| Parseo automático de emails de booking (IMAP/Gmail OAuth) | Complejidad alta + superficie de seguridad/privacidad; manual upload basta para MVP |
| Pagos in-app (settle-up con tarjeta) | Riesgo regulatorio/licencia; solo registramos balances, transferencias fuera de la app |
| Compartir ubicación en tiempo real | Privacidad + drenaje de batería; los pins estáticos cubren la necesidad |
| App nativa iOS/Android | PWA cubre necesidades del MVP; reduce costo de mantenimiento |
| Multi-idioma (i18n expuesto) | Solo español en v1; i18n-ready técnicamente pero no expuesto |
| Compresión automática de PDFs/imágenes en cliente | Confiamos en límite 10 MB; reduce complejidad de v1 |
| Búsqueda full-text dentro de documentos | OCR es expensivo; usuarios encuentran por categoría/título |

## Traceability

Mapeo de requisitos a fases. Actualizado tras creación del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1: Foundation + Auth | Complete |
| INFRA-02 | Phase 1: Foundation + Auth | Complete |
| INFRA-03 | Phase 1: Foundation + Auth | Complete |
| INFRA-04 | Phase 1: Foundation + Auth | Complete |
| INFRA-05 | Phase 1: Foundation + Auth | Complete |
| INFRA-06 | Phase 1: Foundation + Auth | Complete |
| INFRA-07 | Phase 1: Foundation + Auth | Complete |
| AUTH-01 | Phase 1: Foundation + Auth | Complete |
| AUTH-02 | Phase 1: Foundation + Auth | Complete |
| AUTH-03 | Phase 1: Foundation + Auth | Complete |
| AUTH-04 | Phase 1: Foundation + Auth | Complete |
| AUTH-05 | Phase 1: Foundation + Auth | Complete |
| AUTH-06 | Phase 1: Foundation + Auth | Complete |
| UI-01 | Phase 1: Foundation + Auth | Complete |
| UI-02 | Phase 1: Foundation + Auth | Complete |
| UI-03 | Phase 1: Foundation + Auth | Complete |
| TRIP-01 | Phase 2: Trip + Member Management | Pending |
| TRIP-02 | Phase 2: Trip + Member Management | Pending |
| TRIP-03 | Phase 2: Trip + Member Management | Pending |
| TRIP-04 | Phase 2: Trip + Member Management | Pending |
| TRIP-05 | Phase 2: Trip + Member Management | Pending |
| TRIP-06 | Phase 2: Trip + Member Management | Pending |
| TRIP-07 | Phase 2: Trip + Member Management | Pending |
| TRIP-08 | Phase 2: Trip + Member Management | Pending |
| TRIP-09 | Phase 2: Trip + Member Management | Pending |
| UI-05 | Phase 2: Trip + Member Management | Pending |
| DOCS-01 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-02 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-03 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-04 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-05 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-06 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-07 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-08 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-09 | Phase 3: Document Vault + PWA Offline | Pending |
| DOCS-10 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-01 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-02 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-03 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-04 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-05 | Phase 3: Document Vault + PWA Offline | Pending |
| PWA-06 | Phase 3: Document Vault + PWA Offline | Pending |
| UI-04 | Phase 3: Document Vault + PWA Offline | Pending |
| ITIN-01 | Phase 4: Itinerary + Realtime | Pending |
| ITIN-02 | Phase 4: Itinerary + Realtime | Pending |
| ITIN-03 | Phase 4: Itinerary + Realtime | Pending |
| ITIN-04 | Phase 4: Itinerary + Realtime | Pending |
| ITIN-05 | Phase 4: Itinerary + Realtime | Pending |

**Coverage:**
- v1 requirements: 48 total (7 INFRA + 6 AUTH + 9 TRIP + 10 DOCS + 6 PWA + 5 ITIN + 5 UI)
- Mapped to phases: 48/48
- Unmapped: 0

> UI-01..05 are cross-cutting conventions. Each is assigned to the phase where it first ships as a visible, enforced constraint — subsequent phases inherit the pattern. Phase 5 carries no new requirements; it is a QA hardening gate.

---
*Requirements defined: 2026-05-29*
*Last updated: 2026-05-29 after roadmap creation*
