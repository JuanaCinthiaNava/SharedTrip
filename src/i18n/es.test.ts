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

describe('es.trip namespace (Phase 02 Plan 01 — trip create/edit/delete strings)', () => {
  it('has all required string keys', () => {
    const stringKeys = [
      'createCta', 'joinCta', 'nameLabel', 'namePlaceholder', 'datesLabel',
      'noDates', 'descriptionLabel', 'saveCta', 'editCta', 'deleteCta',
      'deleteDialogHeading', 'deleteDialogBody', 'invalidName', 'invalidDateRange',
    ] as const
    for (const key of stringKeys) {
      expect(typeof es.trip[key]).toBe('string')
      expect((es.trip[key] as string).length).toBeGreaterThan(0)
    }
  })

  it('deleteConfirmLabel is a function that accepts a name', () => {
    expect(typeof es.trip.deleteConfirmLabel).toBe('function')
    const result = es.trip.deleteConfirmLabel('Mi viaje')
    expect(typeof result).toBe('string')
    expect(result).toContain('Mi viaje')
  })
})

describe('es.members namespace (Phase 02 Plan 01 — member list + actions)', () => {
  it('has all required string keys', () => {
    const stringKeys = [
      'heading', 'badgeCreator', 'badgeYou', 'removeCta',
      'removeDialogConfirm', 'leaveCta', 'leaveDialogConfirm', 'cancel',
    ] as const
    for (const key of stringKeys) {
      expect(typeof es.members[key]).toBe('string')
      expect((es.members[key] as string).length).toBeGreaterThan(0)
    }
  })

  it('removeDialogHeading is a function that accepts a name', () => {
    expect(typeof es.members.removeDialogHeading).toBe('function')
    const result = es.members.removeDialogHeading('Ana')
    expect(typeof result).toBe('string')
    expect(result).toContain('Ana')
  })

  it('leaveDialogHeading is a function that accepts a trip name', () => {
    expect(typeof es.members.leaveDialogHeading).toBe('function')
    const result = es.members.leaveDialogHeading('Cancún 2026')
    expect(typeof result).toBe('string')
    expect(result).toContain('Cancún 2026')
  })
})

describe('es.invite namespace (Phase 02 Plan 01 — invite card strings)', () => {
  it('has all required string keys', () => {
    const stringKeys = ['cardHeading', 'cardBody', 'copyCta', 'copiedToast'] as const
    for (const key of stringKeys) {
      expect(typeof es.invite[key]).toBe('string')
      expect((es.invite[key] as string).length).toBeGreaterThan(0)
    }
  })

  it('shareMessage is a function accepting name, code, origin', () => {
    expect(typeof es.invite.shareMessage).toBe('function')
    const result = es.invite.shareMessage('Cancún 2026', 'CANC-7HXY', 'https://sharedtrip.app')
    expect(typeof result).toBe('string')
    expect(result).toContain('Cancún 2026')
    expect(result).toContain('CANC-7HXY')
    expect(result).toContain('https://sharedtrip.app')
  })
})
