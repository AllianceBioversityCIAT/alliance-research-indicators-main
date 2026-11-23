import { controlListNaturalCompare } from './control-list-natural-compare.util';

/**
 * T-04 — server-side mirror of the client's naturalCompare fixture
 * (tasks.md T-03 fixture, same family): same input, same expected order, so
 * A13's ordering matches the admin table's.
 */
describe('controlListNaturalCompare', () => {
  it('orders UOM-2 before UOM-10 (natural numeric order), case-insensitively, nulls last', () => {
    const input = ['UOM-10', 'UOM-2', 'uom-1', null];

    const sorted = [...input].sort(controlListNaturalCompare);

    expect(sorted).toEqual(['uom-1', 'UOM-2', 'UOM-10', null]);
  });

  // Same family as tasks.md T-03 falsifier 4: a bare `localeCompare` (no
  // `numeric`) sorts UOM-10 before UOM-2 — this proves the comparator does
  // NOT degrade to that.
  it('is not a bare lexical localeCompare (numeric must be honored)', () => {
    expect(controlListNaturalCompare('UOM-2', 'UOM-10')).toBeLessThan(0);
    // Contrast: the bare lexical baseline sorts the other way.
    expect('UOM-2'.localeCompare('UOM-10')).toBeGreaterThan(0);
  });

  it('treats null and undefined as equal to each other and sorts both after every string', () => {
    expect(controlListNaturalCompare(null, undefined)).toBe(0);
    expect(controlListNaturalCompare('A', null)).toBeLessThan(0);
    expect(controlListNaturalCompare(null, 'A')).toBeGreaterThan(0);
  });

  it('is case-insensitive on letters alone', () => {
    expect(controlListNaturalCompare('abc', 'ABC')).toBe(0);
  });
});
