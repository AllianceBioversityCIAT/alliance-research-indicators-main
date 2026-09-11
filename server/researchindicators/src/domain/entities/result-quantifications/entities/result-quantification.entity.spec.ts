import { quantificationNumberTransformer } from './result-quantification.entity';

/**
 * @sdd-spec docs/specs/changes/measure-number-signed-decimal — T-02
 *
 * Unit-level coverage of `quantificationNumberTransformer` only. Per the
 * task's disqualifier, a test at this seam cannot prove the driver's real
 * hydration type — that is `T-07`'s fixture, run against real MySQL. What
 * this file proves is that the transformer functions themselves implement
 * the DD-2 null contract and the round-trip shape the composite key in
 * `base-service.ts` depends on.
 */
describe('quantificationNumberTransformer (T-02, DD-1/DD-2)', () => {
  describe('from — DB value to entity (R-MSD-003 AC.7, R-MSD-013)', () => {
    it('maps a DB null to null, never 0 (DD-2 null contract)', () => {
      expect(quantificationNumberTransformer.from(null)).toBeNull();
    });

    it('maps DB undefined to null', () => {
      expect(quantificationNumberTransformer.from(undefined)).toBeNull();
    });

    it('coerces the decimal string mysql2 hydrates DECIMAL(24,4) as, into a real signed number', () => {
      // mysql2 hydrates DECIMAL via readLengthCodedString (design.md §5.4) —
      // '-12.7500' is the *shape* that produces. The value itself is still a
      // hand-written literal: this tier cannot obtain a real read. T-07's
      // fixture owns the R-MSD-003 (:257) / DD-19 read-provenance clause.
      expect(quantificationNumberTransformer.from('-12.7500')).toBe(-12.75);
    });

    it('does not round a fractional value', () => {
      expect(quantificationNumberTransformer.from('2.5000')).toBe(2.5);
    });
  });

  describe('to — entity value to DB (runs on every upsertByCompositeKeys save, J-24)', () => {
    it('maps an entity null to DB null, never 0 (DD-2 null contract)', () => {
      expect(quantificationNumberTransformer.to(null)).toBeNull();
    });

    it('maps entity undefined to null', () => {
      expect(quantificationNumberTransformer.to(undefined)).toBeNull();
    });

    it('passes a signed decimal value through unchanged', () => {
      expect(quantificationNumberTransformer.to(-12.75)).toBe(-12.75);
    });
  });

  describe('round trip — the untouched-row / composite-key invariant (design.md §5.3, §5.5)', () => {
    it('a hydrated value resends as the same number, so String(value) — the composite key basis in base-service.ts — stays stable', () => {
      const hydrated = quantificationNumberTransformer.from('10.0000');
      const resaved = quantificationNumberTransformer.to(hydrated);
      expect(String(resaved)).toBe('10');
    });

    it('null survives a read -> resave cycle as null, not 0, keeping quantificationRowAbsent true', () => {
      const hydrated = quantificationNumberTransformer.from(null);
      const resaved = quantificationNumberTransformer.to(hydrated);
      expect(resaved).toBeNull();
    });
  });
});
