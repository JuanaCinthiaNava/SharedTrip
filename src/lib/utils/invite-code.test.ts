import { describe, it, expect } from 'vitest'
import {
  normalizeInviteCode,
  isWellFormedInviteCode,
  CODE_RE,
} from './invite-code'

// Tests for the invite-code utility functions used by InviteCodeForm + the /join/[code] route.
// These are pure utility functions — no Supabase, no network.

describe('CODE_RE format regex', () => {
  it('accepts the seed code TEST-AB12 (uppercase)', () => {
    expect(CODE_RE.test('TEST-AB12')).toBe(true)
  })

  it('accepts the seed code test-ab12 (lowercase)', () => {
    expect(CODE_RE.test('test-ab12')).toBe(true)
  })

  it('accepts a realistic generated code MARR-4F9K', () => {
    expect(CODE_RE.test('MARR-4F9K')).toBe(true)
  })

  it('accepts a short prefix with 3-char suffix AA-B2C', () => {
    expect(CODE_RE.test('AA-B2C')).toBe(true)
  })

  it('rejects a code with no hyphen (hello)', () => {
    expect(CODE_RE.test('hello')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(CODE_RE.test('')).toBe(false)
  })

  it('rejects a code with only prefix (TEST-)', () => {
    expect(CODE_RE.test('TEST-')).toBe(false)
  })

  it('rejects a code with only suffix (-AB12)', () => {
    expect(CODE_RE.test('-AB12')).toBe(false)
  })

  it('rejects a code with special characters TEST-AB!2', () => {
    expect(CODE_RE.test('TEST-AB!2')).toBe(false)
  })

  it('rejects a very long code exceeding expected bounds', () => {
    expect(CODE_RE.test('TOOLONGPREFIX-TOOLONGSUFFIX')).toBe(false)
  })
})

describe('normalizeInviteCode', () => {
  it('trims whitespace', () => {
    expect(normalizeInviteCode('  TEST-AB12  ')).toBe('TEST-AB12')
  })

  it('converts to uppercase', () => {
    expect(normalizeInviteCode('test-ab12')).toBe('TEST-AB12')
  })

  it('trims and uppercases together', () => {
    expect(normalizeInviteCode(' test-ab12 ')).toBe('TEST-AB12')
  })

  it('handles already-uppercase code unchanged', () => {
    expect(normalizeInviteCode('TEST-AB12')).toBe('TEST-AB12')
  })
})

describe('isWellFormedInviteCode', () => {
  it('returns true for TEST-AB12 after normalization', () => {
    expect(isWellFormedInviteCode('TEST-AB12')).toBe(true)
  })

  it('returns true for lowercase input (normalizes before check)', () => {
    expect(isWellFormedInviteCode('test-ab12')).toBe(true)
  })

  it('returns true for input with surrounding whitespace', () => {
    expect(isWellFormedInviteCode('  TEST-AB12  ')).toBe(true)
  })

  it('returns false for no-hyphen input', () => {
    expect(isWellFormedInviteCode('hello')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isWellFormedInviteCode('')).toBe(false)
  })

  it('returns false for whitespace-only string', () => {
    expect(isWellFormedInviteCode('   ')).toBe(false)
  })
})

import { generateInviteCode } from './invite-code'

describe('generateInviteCode', () => {
  it('always produces a CODE_RE-valid code (500 iterations)', () => {
    for (let i = 0; i < 500; i++) {
      const code = generateInviteCode('Cancún 2026')
      expect(CODE_RE.test(code)).toBe(true)
    }
  })

  it('suffix never contains ambiguous characters O, I, L, 0, 1', () => {
    const ambiguous = new Set(['O', 'I', 'L', '0', '1'])
    for (let i = 0; i < 500; i++) {
      const code = generateInviteCode('Cancún 2026')
      const suffix = code.split('-')[1]
      for (const char of suffix) {
        expect(ambiguous.has(char)).toBe(false)
      }
    }
  })

  it('produces a CODE_RE-valid code for a 1-character name (prefix padded)', () => {
    expect(CODE_RE.test(generateInviteCode('7'))).toBe(true)
    expect(CODE_RE.test(generateInviteCode('🌴'))).toBe(true)
    expect(CODE_RE.test(generateInviteCode(' '))).toBe(true)
  })

  it('prefix strips non-alpha and uppercases (café 2026 → prefix starts with CAFE)', () => {
    // Run multiple times; every prefix must be CAFE (first 4 alpha chars of "café 2026")
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode('café 2026')
      const prefix = code.split('-')[0]
      expect(prefix).toBe('CAFE')
    }
  })

  it('output is uppercase — normalizeInviteCode is a no-op', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode('Cancún 2026')
      expect(normalizeInviteCode(code)).toBe(code)
    }
  })
})
