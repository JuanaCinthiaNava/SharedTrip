import { describe, it, expect } from 'vitest'
import { formatTripRange, toLocalDateString, parseLocalDate } from './date-format'

// Tests for the es-MX date formatting utilities.
// These are pure utility functions — no Supabase, no network.
// Critical: guards against UTC off-by-one day shift in es-MX (UTC-6) — RESEARCH Pitfall 2.

describe('parseLocalDate + toLocalDateString round-trip', () => {
  it('round-trips 2026-06-05 without UTC day shift', () => {
    // The core Pitfall 2 guard: new Date('2026-06-05') would shift to June 4 in UTC-6
    expect(toLocalDateString(parseLocalDate('2026-06-05'))).toBe('2026-06-05')
  })

  it('round-trips 2026-01-01 (year boundary)', () => {
    expect(toLocalDateString(parseLocalDate('2026-01-01'))).toBe('2026-01-01')
  })

  it('round-trips 2026-12-31 (year-end)', () => {
    expect(toLocalDateString(parseLocalDate('2026-12-31'))).toBe('2026-12-31')
  })

  it('parseLocalDate constructs a local-midnight Date (getDate() matches day)', () => {
    const d = parseLocalDate('2026-06-05')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(5) // 0-indexed: June = 5
    expect(d.getDate()).toBe(5)
  })
})

describe('formatTripRange', () => {
  it('single date returns string containing "5" and "jun" (no off-by-one to 4)', () => {
    const result = formatTripRange('2026-06-05', null)
    expect(result).not.toBeNull()
    expect(result).toContain('5')
    expect(result!.toLowerCase()).toContain('jun')
  })

  it('same-month range returns a range string with both endpoints', () => {
    const result = formatTripRange('2026-06-05', '2026-06-12')
    expect(result).not.toBeNull()
    expect(result).toContain('5')
    expect(result).toContain('12')
    expect(result!.toLowerCase()).toContain('jun')
  })

  it('cross-month range renders both month names', () => {
    const result = formatTripRange('2026-06-28', '2026-07-03')
    expect(result).not.toBeNull()
    // Both months must appear
    expect(result!.toLowerCase()).toContain('jun')
    expect(result!.toLowerCase()).toContain('jul')
  })

  it('cross-year range renders both years', () => {
    const result = formatTripRange('2026-12-30', '2027-01-02')
    expect(result).not.toBeNull()
    expect(result).toContain('2026')
    expect(result).toContain('2027')
  })

  it('both null returns null (caller hides date row — D-03)', () => {
    expect(formatTripRange(null, null)).toBeNull()
  })

  it('end-only (start null, end set) returns a single-date string', () => {
    const result = formatTripRange(null, '2026-06-12')
    expect(result).not.toBeNull()
    expect(result).toContain('12')
  })
})
