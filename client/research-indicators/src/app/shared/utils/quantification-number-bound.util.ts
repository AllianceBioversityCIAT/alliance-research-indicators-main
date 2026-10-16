// @akili-spec docs/specs/changes/measure-number-signed-decimal (T-11 — DD-14: the derived magnitude
// bound, extracted so the production call site and its test suites share ONE implementation rather
// than two that can silently disagree. `input.component.spec.ts` (T-09) previously carried its own
// copy of this exact formula as a test-side helper named `deriveMaxForScale` — that helper's own
// comment said "T-11's call site is what will derive `max` from a scale for real," anticipating this
// file. T-11 imports it from here instead of duplicating it.

/**
 * DD-14 / R-MSD-012 AC.2, AC.3: `max = 2^(53 − ⌈log₂(10^scale)⌉) − 1`, `min = −max`.
 *
 * The condition that must hold is that a `number`'s spacing never exceed the decimal grid at the
 * given scale — `ulp(v) ≤ 10^-scale` — which is what this formula states. Verified by execution at
 * every scale 0–4 (`design.md` §6.2): zero grid collisions and zero round-trip failures, where the
 * naive `⌊(2⁵³−1)/10^scale⌋` bound admitted 3,616 round-trip failures per 20,000 samples near the
 * scale-4 bound. Scale 0 lands exactly on `Number.MAX_SAFE_INTEGER` as a CONSEQUENCE of the formula,
 * not a special case.
 *
 * | scale | derived max |
 * | --- | --- |
 * | 0 | 9,007,199,254,740,991 (`Number.MAX_SAFE_INTEGER`) |
 * | 1 | 562,949,953,421,311 |
 * | 2 | 70,368,744,177,663 |
 * | 3 | 8,796,093,022,207 |
 * | 4 | 549,755,813,887 |
 *
 * `scale` is a configuration parameter, not user input (`R-MSD-012` AC.1) — a scale outside the
 * declared domain 0…4 is a development-time configuration error, thrown rather than silently
 * clamped or rounded.
 */
export function deriveMaxForScale(scale: number): number {
  if (!Number.isInteger(scale) || scale < 0 || scale > 4) {
    throw new Error(`scale ${scale} is outside the supported configuration domain 0…4`);
  }
  const bitsConsumedByScale = Math.ceil(Math.log2(10 ** scale));
  return 2 ** (53 - bitsConsumedByScale) - 1;
}
