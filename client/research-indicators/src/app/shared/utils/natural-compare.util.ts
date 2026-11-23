// @akili-spec institutional-performance/control-lists T-03 (client half) — design §6.3,
// requirements R-CTL-009 "Natural sort". A lexical `localeCompare` (no `numeric` option) orders
// digit runs character-by-character, so "UOM-10" sorts before "UOM-2" ('1' < '2'). The `numeric`
// collation option compares embedded digit runs by their numeric value instead, which is what
// "ascending in natural numeric order" (F-7) means for codes like `UOM-2` / `UOM-10` / `L4`.
//
// Falsifier 4 (tasks.md T-03): swapping this for a bare `localeCompare` (no `numeric`) must sort
// `UOM-10` before `UOM-2` — i.e. the comparator below must NOT degrade to that.

/**
 * Natural, case-insensitive, nulls-last comparator for control-list codes/values.
 *
 * - Natural: digit runs compare by numeric value (`UOM-2` < `UOM-10`), not lexically.
 * - Case-insensitive: `uom-1` and `UOM-1` compare equal on case alone (`sensitivity: 'base'`).
 * - Nulls last: `null` / `undefined` always sort after every defined string, and two
 *   null/undefined values compare equal — so a stable sort (`Array.prototype.sort`, stable
 *   since ES2019) never reorders them relative to each other.
 *
 * Fixture (tasks.md T-03): `['UOM-10', 'UOM-2', 'uom-1', null]` → `['uom-1', 'UOM-2', 'UOM-10', null]`.
 */
export function naturalCompare(a: string | null | undefined, b: string | null | undefined): number {
  const aIsNil = a === null || a === undefined;
  const bIsNil = b === null || b === undefined;

  if (aIsNil && bIsNil) return 0;
  if (aIsNil) return 1;
  if (bIsNil) return -1;

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}
