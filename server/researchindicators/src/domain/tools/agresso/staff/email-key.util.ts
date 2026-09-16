// @akili-spec changes/agresso-staff-deactivation (T-01 — one email key, one shield predicate)
//
// WHY THIS FILE EXISTS, AND WHY BOTH FUNCTIONS LIVE IN IT
//
// Judgment Day JD-3 (both judges, independently) found a defect that is invisible when the two
// concerns are written apart: the reconciler's `isUsableEmail` rejects on `email.length > 150`
// measured on the **untrimmed** value, while the index and match keys are `email.trim()
// .toLowerCase()`. Those are different strings. An address padded with trailing spaces — what a
// fixed-width ERP export produces for EVERY member at once — is rejected by the predicate while its
// trimmed key matches a stored `sec_users.email` exactly. Used as a deactivation shield, that
// member shields nothing and a live account is retired.
//
// The bug was never a duplicated function; it was a predicate measuring a different string than the
// key it gated. So the key and the predicate that decides whether a key exists are defined here,
// next to each other, where the pairing is visible in one screen.

/** `sec_users.email` is `varchar(150)`. Kept here for reference only — see the warning below. */
export const MAX_EMAIL_LENGTH = 150;

/**
 * The one email key. Every index, every match and every shield in the staff sync derives from this
 * function, so two call sites can never drift apart on case or whitespace.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The deactivation shield key for one raw payload member, or `null` when the member has no key at
 * all.
 *
 * Deliberately NOT `isUsableEmail`. This predicate measures the **same string as the key** —
 * whether anything survives `trim()` — and applies no length limit, because an over-length RAW
 * value whose TRIMMED value fits is exactly the JD-3 case: it can and does match a stored row.
 *
 * The null guard precedes `trim()` on purpose: the shield set is built over the RAW payload,
 * before the reconciler's validation pass, so this is the first thing to touch the value and
 * `normalizeEmail` has no guard of its own.
 */
export function shieldKeyFor(email: string | null | undefined): string | null {
  if (email == null) {
    return null;
  }
  if (email.trim().length === 0) {
    return null;
  }
  return normalizeEmail(email);
}
