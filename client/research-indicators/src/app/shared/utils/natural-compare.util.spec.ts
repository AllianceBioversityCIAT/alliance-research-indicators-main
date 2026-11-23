import { naturalCompare } from './natural-compare.util';

describe('natural-compare.util', () => {
  // tasks.md T-03 fixture — the two-digit number (`UOM-10`) is the disqualifier guard: a
  // fixture without one cannot tell natural from lexical order (`1` < `2` either way).
  it('sorts the fixture naturally, case-insensitively, with nulls last', () => {
    const input = ['UOM-10', 'UOM-2', 'uom-1', null];
    const sorted = [...input].sort(naturalCompare);
    expect(sorted).toEqual(['uom-1', 'UOM-2', 'UOM-10', null]);
  });

  // Falsifier 4: swapping this comparator for a bare `localeCompare` (no `numeric`) sorts
  // 'UOM-10' before 'UOM-2' lexically ('1' < '2'). This pins the opposite, natural order.
  it('orders a two-digit numeric suffix after a one-digit one (natural, not lexical)', () => {
    expect(naturalCompare('UOM-2', 'UOM-10')).toBeLessThan(0);
    expect(naturalCompare('UOM-10', 'UOM-2')).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    expect(naturalCompare('uom-1', 'UOM-1')).toBe(0);
  });

  it('puts null and undefined after every defined string', () => {
    expect(naturalCompare('UOM-1', null)).toBeLessThan(0);
    expect(naturalCompare(null, 'UOM-1')).toBeGreaterThan(0);
    expect(naturalCompare(undefined, 'UOM-1')).toBeGreaterThan(0);
  });

  it('treats two nil values as equal', () => {
    expect(naturalCompare(null, null)).toBe(0);
    expect(naturalCompare(null, undefined)).toBe(0);
    expect(naturalCompare(undefined, undefined)).toBe(0);
  });

  it('is stable: a sort over equal keys (case/numeric-insensitive ties) keeps original relative order', () => {
    // Two entries that compare equal under naturalCompare ('L1' vs 'l1') must keep their
    // original relative order — Array.prototype.sort is stable (ES2019+), and the comparator
    // itself returns 0 for them, so sort() must not reorder.
    const input = [
      { id: 1, code: 'L1' },
      { id: 2, code: 'l1' }
    ];
    const sorted = [...input].sort((a, b) => naturalCompare(a.code, b.code));
    expect(sorted.map(row => row.id)).toEqual([1, 2]);
  });
});
