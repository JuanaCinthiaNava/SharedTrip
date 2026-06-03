import { describe, it, expect } from 'vitest'
import { es } from './es'

// Tests that the es.entry namespace has all keys required by InviteCodeForm and page.tsx.
// These tests catch accidental key renames or deletions that would break the UI.

describe('es.entry namespace (Plan 09 — invite-code entry screen)', () => {
  it('has a heading string', () => {
    expect(typeof es.entry.heading).toBe('string')
    expect(es.entry.heading.length).toBeGreaterThan(0)
  })

  it('has a subheading string', () => {
    expect(typeof es.entry.subheading).toBe('string')
    expect(es.entry.subheading.length).toBeGreaterThan(0)
  })

  it('has a codeLabel string', () => {
    expect(typeof es.entry.codeLabel).toBe('string')
    expect(es.entry.codeLabel.length).toBeGreaterThan(0)
  })

  it('has a codePlaceholder string', () => {
    expect(typeof es.entry.codePlaceholder).toBe('string')
    expect(es.entry.codePlaceholder.length).toBeGreaterThan(0)
  })

  it('has a submitCta string', () => {
    expect(typeof es.entry.submitCta).toBe('string')
    expect(es.entry.submitCta.length).toBeGreaterThan(0)
  })

  it('has an invalidFormat string (for Zod inline validation message)', () => {
    expect(typeof es.entry.invalidFormat).toBe('string')
    expect(es.entry.invalidFormat.length).toBeGreaterThan(0)
  })

  it('has all six required keys', () => {
    const keys = ['heading', 'subheading', 'codeLabel', 'codePlaceholder', 'submitCta', 'invalidFormat'] as const
    for (const key of keys) {
      expect(es.entry).toHaveProperty(key)
    }
  })
})

describe('es.errors namespace (existing — not deleted by Plan 09)', () => {
  it('invalidJoinToken still exists', () => {
    expect(typeof es.errors.invalidJoinToken).toBe('string')
    expect(es.errors.invalidJoinToken.length).toBeGreaterThan(0)
  })

  it('genericNetwork still exists', () => {
    expect(typeof es.errors.genericNetwork).toBe('string')
    expect(es.errors.genericNetwork.length).toBeGreaterThan(0)
  })
})
