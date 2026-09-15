import { formatCapdevMetrics } from './capdev-metrics.formatter';
import { CapdevBulkMetricsDto } from './dto/capdev-bulk-group.dto';

/**
 * Seam under test: `formatCapdevMetrics(metrics, countryNames)` — the pure
 * function boundary design.md §6.5 assigns this module. Every case is
 * driven by R-CBU-006's metric table, its six ACs, and its "Degenerate
 * metrics" scenario, plus the two defects T-04's Reviewer forward-flagged
 * (Advisory 1: `"0"` truthiness; Advisory 2: half-range dates) that this
 * task exists to close.
 */

/** Base "happy path" metrics row — individual tests override only what they vary. */
function baseMetrics(
  overrides: Partial<CapdevBulkMetricsDto> = {},
): CapdevBulkMetricsDto {
  return {
    agreement_id: 'AGR-1',
    trainings_count: 12,
    participants_total: 1204,
    female_participants_total: 698,
    start_date: new Date('2025-03-15T00:00:00Z'),
    end_date: new Date('2025-06-20T00:00:00Z'),
    ...overrides,
  };
}

/** Negative assertion sweep shared by every case: none of these tokens may appear in any produced field. */
const FORBIDDEN_PATTERN = /NaN|Infinity|undefined|null|Invalid Date/i;

// `{{#if}}`-guarded fields in the template: these must never render the
// literal "0" (Handlebars treats "0" as truthy). `trainingsCount` is
// deliberately excluded — it is unguarded (`{{trainingsCount}} trainings
// conducted`), so a rendered "0" is correct there, not a defect.
const GUARDED_FIELDS = new Set([
  'countries',
  'startDate',
  'endDate',
  'participantsCount',
  'percentageWomen',
]);

function assertNoForbiddenTokens(fields: Record<string, string>) {
  for (const [key, value] of Object.entries(fields)) {
    expect(value).not.toMatch(FORBIDDEN_PATTERN);
    // The empty-string-not-zero contract: no guarded field may be the
    // literal "0" — Handlebars' {{#if}} treats a non-empty string as
    // truthy, so a stringified zero would render a clause meant to be
    // absent. Any field that legitimately renders a positive value in this
    // suite is asserted explicitly elsewhere; this guards the rest.
    if (GUARDED_FIELDS.has(key)) {
      expect(value).not.toBe('0');
    }
  }
}

describe('formatCapdevMetrics', () => {
  // ---- AC.1 — trainings count, thousands separator ----------------------
  it('renders trainingsCount with en-US thousands separators (AC.1)', () => {
    const result = formatCapdevMetrics(baseMetrics({ trainings_count: 1234 }), [
      'Kenya',
    ]);
    expect(result.trainingsCount).toBe('1,234');
  });

  it('renders a small trainings count without a separator (AC.1)', () => {
    const result = formatCapdevMetrics(baseMetrics({ trainings_count: 12 }), [
      'Kenya',
    ]);
    expect(result.trainingsCount).toBe('12');
  });

  // ---- AC.2 — countries: dedup, sort, join, empty-set literal -----------
  it('comma-joins, deduplicates, and alphabetically orders country names (AC.2)', () => {
    const result = formatCapdevMetrics(baseMetrics(), [
      'Uganda',
      'Kenya',
      'Uganda',
      'Ethiopia',
    ]);
    expect(result.countries).toBe('Ethiopia, Kenya, Uganda');
  });

  it('filters out blank/whitespace-only country entries', () => {
    const result = formatCapdevMetrics(baseMetrics(), [
      'Kenya',
      '',
      '   ',
      'Uganda',
    ]);
    expect(result.countries).toBe('Kenya, Uganda');
  });

  it('renders the literal "multiple countries" when the country set is empty (AC.2)', () => {
    const result = formatCapdevMetrics(baseMetrics(), []);
    expect(result.countries).toBe('multiple countries');
  });

  it('renders "multiple countries" when the country list is null/undefined', () => {
    expect(formatCapdevMetrics(baseMetrics(), null).countries).toBe(
      'multiple countries',
    );
    expect(formatCapdevMetrics(baseMetrics(), undefined).countries).toBe(
      'multiple countries',
    );
  });

  // ---- AC.4 — zero/all-null participants: both clauses absent -----------
  it('renders empty participantsCount and percentageWomen when total is 0 (AC.4)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 0, female_participants_total: 0 }),
      ['Kenya'],
    );
    expect(result.participantsCount).toBe('');
    expect(result.percentageWomen).toBe('');
  });

  // ---- Advisory 1 — the genuinely design-uncovered case ------------------
  it('renders empty percentageWomen when participants > 0 but women is 0 (design-uncovered case)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 100, female_participants_total: 0 }),
      ['Kenya'],
    );
    expect(result.participantsCount).toBe('100');
    // Never "0" — "0" is truthy to Handlebars' {{#if}} and would render
    // "— 0% of whom were women" even though the clause must be suppressed.
    expect(result.percentageWomen).toBe('');
    expect(result.percentageWomen).not.toBe('0');
  });

  it('renders a real, rounded percentage carrying its own "%" sign when women share is >= 1% (AC — normal share)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 1204, female_participants_total: 698 }),
      ['Kenya'],
    );
    expect(result.participantsCount).toBe('1,204');
    expect(result.percentageWomen).toBe('58%'); // round(698/1204*100) = 58
  });

  it('renders a plain example share with the "%" sign (e.g. 37 of 100)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 100, female_participants_total: 37 }),
      ['Kenya'],
    );
    expect(result.percentageWomen).toBe('37%');
  });

  // ---- OD-2 (2026-08-09) — the floor clause, not suppression -------------
  it('renders the floor clause "<1%" for a non-zero sub-1% share (e.g. 4 of 1,240) (AC.7)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 1240, female_participants_total: 4 }),
      ['Kenya'],
    );
    // 4/1240*100 = 0.322...% — non-zero, must render the floor, never "0%".
    expect(result.percentageWomen).toBe('<1%');
    expect(result.percentageWomen).not.toBe('0%');
  });

  it('renders "<1%" (never a rounded-up "1%") for a share in [0.5, 1) — D-OD2-a boundary (6 of 1,000 = 0.6%)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 1000, female_participants_total: 6 }),
      ['Kenya'],
    );
    // Math.round(0.6) would be 1 — the guard this test exists to catch is a
    // future "simplification" back to round(p) === 0 / round(p).
    expect(result.percentageWomen).toBe('<1%');
    expect(result.percentageWomen).not.toBe('1%');
  });

  it('renders "1%" (not "<1%") for a share exactly at the p === 1 boundary', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 1000, female_participants_total: 10 }),
      ['Kenya'],
    );
    // 10/1000*100 = 1 exactly — the boundary is p < 1, so p === 1 rounds normally.
    expect(result.percentageWomen).toBe('1%');
  });

  it('renders empty percentageWomen for a female count of exactly 0 with participants > 0 (AC.8, still suppressed)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: 1000, female_participants_total: 0 }),
      ['Kenya'],
    );
    expect(result.participantsCount).toBe('1,000');
    expect(result.percentageWomen).toBe('');
    expect(result.percentageWomen).not.toBe('0%');
    expect(result.percentageWomen).not.toBe('<1%');
  });

  // ---- AC.5 / Advisory 2 — dates: all-null and both half-ranges ----------
  it('renders empty startDate/endDate when both dates are null (AC.5)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ start_date: null, end_date: null }),
      ['Kenya'],
    );
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('renders both dates empty when only startDate is present (half-range variant 1)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        start_date: new Date('2025-03-15T00:00:00Z'),
        end_date: null,
      }),
      ['Kenya'],
    );
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('renders both dates empty when only endDate is present (half-range variant 2)', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        start_date: null,
        end_date: new Date('2025-06-20T00:00:00Z'),
      }),
      ['Kenya'],
    );
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
  });

  it('renders both dates as "Month YYYY" when both bounds are present', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        start_date: new Date('2025-03-15T00:00:00Z'),
        end_date: new Date('2025-06-20T00:00:00Z'),
      }),
      ['Kenya'],
    );
    expect(result.startDate).toBe('March 2025');
    expect(result.endDate).toBe('June 2025');
  });

  it('treats an invalid Date as absent, suppressing both bounds', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        start_date: new Date('not-a-real-date'),
        end_date: new Date('2025-06-20T00:00:00Z'),
      }),
      ['Kenya'],
    );
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
    expect(result.startDate).not.toMatch(/invalid/i);
  });

  // ---- Degenerate scenario, end to end (R-CBU-006 "Degenerate metrics") --
  it('R-CBU-006 Degenerate metrics scenario: 3 trainings, no participants, no dates, no countries', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        trainings_count: 3,
        participants_total: 0,
        female_participants_total: 0,
        start_date: null,
        end_date: null,
      }),
      [],
    );

    expect(result.trainingsCount).toBe('3');
    expect(result.countries).toBe('multiple countries');
    expect(result.startDate).toBe('');
    expect(result.endDate).toBe('');
    expect(result.participantsCount).toBe('');
    expect(result.percentageWomen).toBe('');

    assertNoForbiddenTokens(result as unknown as Record<string, string>);
  });

  // ---- Disqualifier sweep — negative assertions over degenerate numerics -
  it('never emits NaN/Infinity for a non-finite trainings_count', () => {
    const result = formatCapdevMetrics(baseMetrics({ trainings_count: NaN }), [
      'Kenya',
    ]);
    expect(result.trainingsCount).not.toMatch(FORBIDDEN_PATTERN);
    expect(result.trainingsCount).toBe('0');
  });

  it('never emits NaN/Infinity when participants_total is non-finite', () => {
    const nanCase = formatCapdevMetrics(
      baseMetrics({ participants_total: NaN, female_participants_total: 5 }),
      ['Kenya'],
    );
    const infinityCase = formatCapdevMetrics(
      baseMetrics({
        participants_total: Infinity,
        female_participants_total: 5,
      }),
      ['Kenya'],
    );
    for (const result of [nanCase, infinityCase]) {
      expect(result.participantsCount).not.toMatch(FORBIDDEN_PATTERN);
      expect(result.percentageWomen).not.toMatch(FORBIDDEN_PATTERN);
      expect(result.participantsCount).toBe('');
      expect(result.percentageWomen).toBe('');
    }
  });

  it('never emits Infinity when female_participants_total is non-finite but participants_total is valid', () => {
    const result = formatCapdevMetrics(
      baseMetrics({
        participants_total: 10,
        female_participants_total: Infinity,
      }),
      ['Kenya'],
    );
    expect(result.percentageWomen).not.toMatch(FORBIDDEN_PATTERN);
  });

  it('treats a negative participants_total as absent, never a negative or NaN string', () => {
    const result = formatCapdevMetrics(
      baseMetrics({ participants_total: -5, female_participants_total: -1 }),
      ['Kenya'],
    );
    expect(result.participantsCount).toBe('');
    expect(result.percentageWomen).toBe('');
    expect(result.participantsCount).not.toMatch(FORBIDDEN_PATTERN);
  });

  // ---- Both-or-neither invariant, swept across the field pair -----------
  it.each([
    ['both null', null, null],
    ['start only', new Date('2025-03-15T00:00:00Z'), null],
    ['end only', null, new Date('2025-06-20T00:00:00Z')],
    [
      'both present',
      new Date('2025-03-15T00:00:00Z'),
      new Date('2025-06-20T00:00:00Z'),
    ],
  ] as const)(
    'startDate/endDate are never a dangling half-range (%s)',
    (_label, start, end) => {
      const result = formatCapdevMetrics(
        baseMetrics({ start_date: start, end_date: end }),
        ['Kenya'],
      );
      const startEmpty = result.startDate === '';
      const endEmpty = result.endDate === '';
      // Both-or-neither: it is never true that exactly one of the two is empty.
      expect(startEmpty).toBe(endEmpty);
    },
  );
});
