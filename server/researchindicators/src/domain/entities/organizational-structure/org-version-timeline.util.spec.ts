import { isYearCovered, yearCoverageSql } from './org-version-timeline.util';

describe('org-version-timeline.util — year coverage (R-ORG-006 AC.1)', () => {
  describe('isYearCovered on [2026, 2028)', () => {
    it.each([
      [2025, false, 'the year before `from`'],
      [2026, true, '`from` itself'],
      [2027, true, '`to - 1`'],
      [2028, false, '`to` itself (half-open)'],
      [2029, false, 'after `to`'],
    ])('year %i -> %s (%s)', (year, expected) => {
      expect(isYearCovered(2026, 2028, year)).toBe(expected);
    });
  });

  describe('isYearCovered on an open-ended version [2026, open)', () => {
    it.each([
      [2025, false],
      [2026, true],
      [2027, true],
      [2099, true],
    ])('year %i -> %s', (year, expected) => {
      expect(isYearCovered(2026, null, year)).toBe(expected);
    });
  });

  it('a one-year version [2026, 2027) covers only 2026', () => {
    expect(isYearCovered(2026, 2027, 2026)).toBe(true);
    expect(isYearCovered(2026, 2027, 2027)).toBe(false);
  });

  describe('yearCoverageSql', () => {
    it('is the same predicate for the given alias and year expression, with no placeholders of its own', () => {
      const sql = yearCoverageSql('v', 'p.y');
      expect(sql).toBe(
        '(v.valid_from_year <= p.y AND (v.valid_to_year IS NULL OR v.valid_to_year > p.y))',
      );
      expect(sql).not.toContain('?');
    });
  });
});
