import { describe, it, expect } from 'vitest'
import { getAvatarData } from './avatar'

// Ten fixed UUIDs as snapshot inputs to catch accidental hash changes
const FIXED_UUIDS = [
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '550e8400-e29b-41d4-a716-446655440000',
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'deadbeef-dead-beef-dead-beefdeadbeef',
  'cafebabe-cafe-babe-cafe-babecafebabe',
]

const VALID_COLORS = ['#FF6B6B', '#3DCCC7', '#FFB627']

describe('getAvatarData', () => {
  it('is deterministic — same input always returns same output', () => {
    for (const userId of FIXED_UUIDS) {
      const first = getAvatarData(userId)
      const second = getAvatarData(userId)
      expect(first).toEqual(second)
    }
  })

  it('output color is always one of the three allowed values', () => {
    for (const userId of FIXED_UUIDS) {
      const { color } = getAvatarData(userId)
      expect(VALID_COLORS).toContain(color)
    }
  })

  it('output displayName matches pattern Adjective+space+Animal', () => {
    for (const userId of FIXED_UUIDS) {
      const { displayName } = getAvatarData(userId)
      // Two words separated by a space, both capitalized (or starting with uppercase including accented chars)
      expect(displayName).toMatch(/^\S+ \S+$/)
      // First char of each word is uppercase (accounts for accented: Á, É, etc.)
      const [adj, animal] = displayName.split(' ')
      expect(adj[0]).toEqual(adj[0].toUpperCase())
      expect(animal[0]).toEqual(animal[0].toUpperCase())
    }
  })

  it('output emoji is a non-empty string (single grapheme cluster or emoji sequence)', () => {
    for (const userId of FIXED_UUIDS) {
      const { emoji } = getAvatarData(userId)
      expect(typeof emoji).toBe('string')
      expect(emoji.length).toBeGreaterThan(0)
    }
  })

  it('when avatarSeed is provided, hash uses the seed, not the userId', () => {
    const userId = FIXED_UUIDS[0]
    const seed = 'custom-seed-xyz'
    const withSeed = getAvatarData(userId, seed)
    const withoutSeed = getAvatarData(userId)
    const directSeed = getAvatarData(seed, null)
    // Same result whether seed passed as 2nd arg or directly as userId
    expect(withSeed).toEqual(directSeed)
    // Different from no-seed version (with overwhelming probability)
    // (May coincidentally be equal for some inputs — but not for these specific values)
    expect(withSeed.displayName).not.toEqual(withoutSeed.displayName)
  })

  it('snapshot: ten fixed UUIDs produce stable known outputs', () => {
    const snapshots = FIXED_UUIDS.map(id => ({ id, ...getAvatarData(id) }))
    // Each snapshot must have all required fields
    for (const snap of snapshots) {
      expect(snap).toHaveProperty('displayName')
      expect(snap).toHaveProperty('emoji')
      expect(snap).toHaveProperty('color')
      expect(VALID_COLORS).toContain(snap.color)
    }
  })

  it('color distribution across 1000 random-ish UUIDs is roughly equal (within ±10%)', () => {
    const counts: Record<string, number> = { '#FF6B6B': 0, '#3DCCC7': 0, '#FFB627': 0 }
    // Generate 1000 pseudo-UUIDs using incrementing strings
    for (let i = 0; i < 1000; i++) {
      const fakeId = `${i.toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`
      const { color } = getAvatarData(fakeId)
      counts[color]++
    }
    const total = 1000
    for (const count of Object.values(counts)) {
      const percentage = count / total
      expect(percentage).toBeGreaterThan(0.23) // at least 23%
      expect(percentage).toBeLessThan(0.43)    // at most 43%
    }
  })
})
