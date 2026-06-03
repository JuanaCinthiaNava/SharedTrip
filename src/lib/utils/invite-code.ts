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
