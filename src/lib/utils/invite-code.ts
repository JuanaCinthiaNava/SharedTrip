// src/lib/utils/invite-code.ts — Invite code format utilities
// Shared by InviteCodeForm (client validation) and the /join/[code] route handler (server guard).
// The DB resolver (get_trip_id_by_invite_code) is the authoritative source of truth on existence;
// these utilities enforce only the structural shape of a well-formed code.

/**
 * CODE_RE — Hybrid invite code format: PREFIX-SUFFIX
 * PREFIX: 2–8 alphanumeric characters
 * SUFFIX: 3–6 alphanumeric characters
 * Case-insensitive match (the caller is responsible for normalization).
 *
 * Accepts: TEST-AB12, MARR-4F9K, AA-B2C, test-ab12
 * Rejects:  hello, TEST-, -AB12, TOOLONGPREFIX-TOOLONGSUFFIX, TEST-AB!2
 */
export const CODE_RE = /^[A-Za-z0-9]{2,8}-[A-Za-z0-9]{3,6}$/

/**
 * normalizeInviteCode — trim whitespace and convert to uppercase.
 * This is the client-side normalization before navigation. The DB resolver also
 * normalizes via upper(trim()), providing a second normalization layer.
 */
export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * isWellFormedInviteCode — returns true if the code (after normalization) matches CODE_RE.
 * Used by InviteCodeForm to validate before calling the network.
 */
export function isWellFormedInviteCode(raw: string): boolean {
  return CODE_RE.test(normalizeInviteCode(raw))
}

/**
 * SUFFIX_ALPHABET — unambiguous character set for invite code suffixes (D-06).
 * Excludes visually similar characters: O/0 (oh/zero), I/1/L (eye/one/ell).
 * Used by generateInviteCode; exposed for external tests.
 */
export const SUFFIX_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/**
 * generateInviteCode — produces a CODE_RE-valid invite code from a trip name.
 *
 * Format: PREFIX-SUFFIX
 *   PREFIX: first ≤4 alpha chars of name (uppercased, non-alpha stripped).
 *           Padded to ≥2 chars from SUFFIX_ALPHABET if the name yields <2 alpha chars.
 *   SUFFIX: 4 chars drawn from SUFFIX_ALPHABET (excludes O/I/L/0/1 — D-06).
 *
 * Uses Math.random() — this is a display capability code, not a secret (A1).
 * The caller is responsible for retrying on UNIQUE constraint violations (Postgres 23505).
 * Output is uppercase, so normalizeInviteCode(generateInviteCode(x)) === generateInviteCode(x).
 */
export function generateInviteCode(name: string): string {
  // PREFIX: extract alpha chars, uppercase, take first 4
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '')
  let prefix = letters.slice(0, 4)
  // Pad to minimum 2 chars if name yields fewer than 2 alpha chars
  if (prefix.length < 2) {
    prefix = (prefix + 'AA').slice(0, 2)
  }
  // SUFFIX: 4 random chars from the unambiguous alphabet
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)]
  }
  return `${prefix}-${suffix}`
}
