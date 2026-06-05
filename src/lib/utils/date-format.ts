// Sourced from .planning/phases/02-trip-member-management/02-RESEARCH.md Patterns 4 & 5.
// Single source of truth for es-MX trip dates.
// Do NOT use .toISOString() or new Date(str) for date-only values — UTC off-by-one in es-MX (UTC-6).
// See RESEARCH Pitfall 2: new Date('2026-06-05') parses as UTC midnight → renders as June 4 in UTC-6.
// Always use parseLocalDate() to read YYYY-MM-DD strings and toLocalDateString() to serialize.

const FMT = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * toLocalDateString — serialize a Date to 'YYYY-MM-DD' using local (not UTC) getters.
 * NEVER use .toISOString().slice(0, 10) — that uses UTC and shifts the day in UTC-6.
 */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * parseLocalDate — parse a 'YYYY-MM-DD' string as a LOCAL midnight Date.
 * NEVER use new Date(str) — that interprets the string as UTC midnight,
 * which shifts the displayed day in UTC-6 (es-MX) timezones.
 */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * formatTripRange — format a trip date range as an es-MX locale string.
 * Returns null when both start and end are null (caller hides the date row — D-03).
 * Uses Intl.DateTimeFormat.formatRange for ranges; format for single dates.
 */
export function formatTripRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return FMT.formatRange(parseLocalDate(start), parseLocalDate(end))
  const one = (start ?? end)!
  return FMT.format(parseLocalDate(one))
}
