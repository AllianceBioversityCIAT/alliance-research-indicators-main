// @akili-spec docs/specs/changes/measure-number-signed-decimal (T-11 — DD-14: the shared derivation,
// imported by both the production call site and `input.component.spec.ts` (T-09), so the two cannot
// silently disagree).
import { deriveMaxForScale } from './quantification-number-bound.util';

describe('deriveMaxForScale (DD-14)', () => {
  // Literals from `design.md` §6.2 / `requirements.md` R-MSD-012 AC.2 — a table verified by
  // execution (zero grid collisions, zero round-trip failures at every scale), not recomputed here
  // by the same formula under test (that would be tautological).
  const scaleTable = [
    { scale: 0, expectedMax: 9_007_199_254_740_991 },
    { scale: 1, expectedMax: 562_949_953_421_311 },
    { scale: 2, expectedMax: 70_368_744_177_663 },
    { scale: 3, expectedMax: 8_796_093_022_207 },
    { scale: 4, expectedMax: 549_755_813_887 }
  ];

  it.each(scaleTable)('scale $scale derives max=$expectedMax', ({ scale, expectedMax }) => {
    expect(deriveMaxForScale(scale)).toBe(expectedMax);
  });

  it('scale 0 lands exactly on Number.MAX_SAFE_INTEGER as a CONSEQUENCE of the formula, not a special case', () => {
    expect(deriveMaxForScale(0)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('R-MSD-012 AC.1 — a scale outside 0…4 is rejected as a configuration error, not silently clamped', () => {
    expect(() => deriveMaxForScale(5)).toThrow(/outside the supported configuration domain/);
    expect(() => deriveMaxForScale(-1)).toThrow(/outside the supported configuration domain/);
    expect(() => deriveMaxForScale(2.5)).toThrow(/outside the supported configuration domain/); // non-integer scale is also a configuration error
  });
});
