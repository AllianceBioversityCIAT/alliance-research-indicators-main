/**
 * Server-side mirror of the client's `naturalCompare` — same semantics, so
 * A13's ordering (design.md §4 A13; requirements R-CTL-006 "Ordered read")
 * matches what the client already renders for the admin table (R-CTL-009).
 * See `client/research-indicators/src/app/shared/utils/natural-compare.util.ts`
 * for the client side of this contract.
 *
 * - Natural: digit runs compare by numeric value (`UOM-2` < `UOM-10`), not
 *   lexically.
 * - Case-insensitive: `uom-1` and `UOM-1` compare equal on case alone
 *   (`sensitivity: 'base'`).
 * - Nulls last: `null` / `undefined` always sort after every defined
 *   string, and two null/undefined values compare equal.
 *
 * `String.prototype.localeCompare` with `{ numeric: true, sensitivity:
 * 'base' }` needs the full-ICU build, which ships by default on Node >= 13 —
 * the same engine family this server already runs on.
 */
export function controlListNaturalCompare(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const aIsNil = a === null || a === undefined;
  const bIsNil = b === null || b === undefined;

  if (aIsNil && bIsNil) return 0;
  if (aIsNil) return 1;
  if (bIsNil) return -1;

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
