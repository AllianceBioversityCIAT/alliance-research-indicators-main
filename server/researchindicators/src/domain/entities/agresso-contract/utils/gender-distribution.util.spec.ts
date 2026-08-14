import {
  mergeGenderDistribution,
  GenderDistributionRow,
} from './gender-distribution.util';

describe('mergeGenderDistribution (R-IMC-005, design §6.2, DD-2/DD-8)', () => {
  // AC.1 — 3 individual Male records + one group record with
  // session_participants_male = 10 → Male = 13.
  // Q2 already groups individual rows by gender_id, so "3 individual Male
  // records" arrives here as a single row carrying count = 3.
  it('AC.1 — sums individual and group contributions for the same gender_id', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 3 },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 10 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([{ id: 1, name: 'Male', count: 13 }]);
  });

  // AC.6 / DC-3 / DD-8 — the defect this task exists to catch. A merge that
  // subordinates group rows to individual rows ("skip a group row that has no
  // individual counterpart") passes AC.1 above and fails only here, because
  // individualRows is empty. Live data measured this session: group format
  // alone contributes 6,057 male / 31,436 female participants against
  // individual format's 99 records total — that rule would discard ~37,000
  // reported participants and show an empty chart instead.
  it('AC.6 — a group-only project (zero individual rows) still reports the full group distribution', () => {
    const individualRows: GenderDistributionRow[] = [];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 10 },
      { id: 2, name: 'Female', count: 4 },
      { id: 3, name: 'Non-binary', count: 0 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    // Non-binary is dropped by AC.3 (zero total), not because it is
    // "unmatched" — the point is symmetry, not survivorship.
    expect(result).toEqual([
      { id: 1, name: 'Male', count: 10 },
      { id: 2, name: 'Female', count: 4 },
    ]);
  });

  // AC.6, gated INDEPENDENTLY of AC.3. The case above pairs a group-only
  // fixture with a zero-total third category, so it asserts two surviving
  // entries and AC.6 is gated jointly with AC.3's zero-dropping rule. It is
  // faithful to requirements.md's own "Scenario: Group-only project" (which
  // expects exactly Male=10 and Female=4) and must stay that way — hence this
  // second case rather than an edit to it. Here all three group categories
  // carry non-zero counts, so "all three categories with their summed counts"
  // is asserted literally, with nothing for AC.3 to remove. Added 2026-07-30
  // by owner authorisation after the T-05 review flagged that no test asserted
  // three non-zero categories surviving a group-only merge (execution.md,
  // "Owner escalation: advisory-derived items", Item 1).
  it('AC.6 — a group-only project with three non-zero categories reports all three', () => {
    const individualRows: GenderDistributionRow[] = [];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 10 },
      { id: 2, name: 'Female', count: 4 },
      { id: 3, name: 'Non-binary', count: 2 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 10 },
      { id: 2, name: 'Female', count: 4 },
      { id: 3, name: 'Non-binary', count: 2 },
    ]);
  });

  // Mirror case for the same symmetry claim: an individual-only project
  // (zero group rows) must report from the individual rows alone, not be
  // zeroed out by an absent group side either.
  it('an individual-only project (zero group rows) still reports the full individual distribution', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 7 },
      { id: 2, name: 'Female', count: 2 },
    ];
    const groupRows: GenderDistributionRow[] = [];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 7 },
      { id: 2, name: 'Female', count: 2 },
    ]);
  });

  // Scenario: Mixed individual and group contribution (requirements.md
  // §R-IMC-005). Also covers AC.2 (NULL → 0) and AC.3 (zero-total dropped)
  // together, matching the requirement's own worked example.
  it('Scenario: mixed individual + group — treats NULL as 0 and drops the zero-total category', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 3 },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 10 },
      { id: 2, name: 'Female', count: 4 },
      // AC.2 — a NULL participant column is 0, not a missing category.
      { id: 3, name: 'Non-binary', count: null as unknown as number },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 13 },
      { id: 2, name: 'Female', count: 4 },
    ]);
    // AC.3 — Non-binary's total is 0, so it must be absent, not present at 0.
    expect(result.find((row) => row.id === 3)).toBeUndefined();
  });

  // AC.2 — undefined is treated the same as null.
  it('AC.2 — an undefined count is treated as 0', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: undefined as unknown as number },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 5 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([{ id: 1, name: 'Male', count: 5 }]);
  });

  // AC.3 — a category whose combined total is zero on both sides is omitted
  // entirely (not returned as { count: 0 }).
  it('AC.3 — a category with a zero combined total is omitted from the section', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 3, name: 'Non-binary', count: 0 },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 3, name: 'Non-binary', count: 0 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([]);
  });

  // AC.4 — no double-counting in either direction: a gender_id present on
  // both sides is summed exactly once per side, and a gender_id present on
  // only one side is not inflated by the other.
  it('AC.4 — does not double-count records via the group columns or vice versa', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 3 },
      { id: 2, name: 'Female', count: 2 },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 5 },
      // Female has no group contribution this run.
      { id: 3, name: 'Non-binary', count: 1 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 8 }, // 3 + 5, not 3*5 or duplicated
      { id: 2, name: 'Female', count: 2 }, // untouched by the group side
      { id: 3, name: 'Non-binary', count: 1 }, // untouched by the individual side
    ]);
  });

  // DD-8 — an id present on only one side is carried through unchanged, even
  // in a mixed fixture where the other side is non-empty (not just the
  // group-only / individual-only edge cases above). Uses an id outside the
  // seeded 1-3 range to prove this is a genuine union-of-ids merge, not a
  // hardcoded three-category shape.
  it('DD-8 — an id present on only one side passes through unchanged in a mixed fixture', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 2 },
      { id: 99, name: 'Unspecified', count: 6 },
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 1 },
      { id: 2, name: 'Female', count: 9 },
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toContainEqual({ id: 99, name: 'Unspecified', count: 6 });
    expect(result).toContainEqual({ id: 2, name: 'Female', count: 9 });
    expect(result).toContainEqual({ id: 1, name: 'Male', count: 3 });
  });

  // AC.7 — the merged result is re-sorted count DESC, id ASC *after* summing.
  // This fixture is built so summing reorders the ranking: Female arrives
  // first (insertion order) and would out-rank Male under natural iteration
  // order or under the input order alone, but the group contribution pushes
  // Male's total above Female's. Only an explicit post-sum sort produces the
  // correct order.
  it('AC.7 — sorts count DESC, id ASC after summing, even when summing reorders the SQL ranking', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 2, name: 'Female', count: 5 }, // inserted first
      { id: 1, name: 'Male', count: 1 }, // inserted second, lower count so far
    ];
    const groupRows: GenderDistributionRow[] = [
      { id: 1, name: 'Male', count: 20 }, // pushes Male's total to 21, above Female
    ];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 21 },
      { id: 2, name: 'Female', count: 5 },
    ]);
  });

  // Tie-break: equal counts sort by id ASC.
  it('sorts by id ASC when counts tie', () => {
    const individualRows: GenderDistributionRow[] = [
      { id: 3, name: 'Non-binary', count: 4 },
      { id: 1, name: 'Male', count: 4 },
    ];
    const groupRows: GenderDistributionRow[] = [];

    const result = mergeGenderDistribution(individualRows, groupRows);

    expect(result).toEqual([
      { id: 1, name: 'Male', count: 4 },
      { id: 3, name: 'Non-binary', count: 4 },
    ]);
  });

  // Both inputs absent — pure defensive case, must not throw and must return
  // an empty array rather than null/undefined (consistent with R-IMC-007
  // AC.2's "empty rather than absent" contract applied at this layer too).
  it('returns an empty array when both inputs are empty', () => {
    expect(mergeGenderDistribution([], [])).toEqual([]);
  });
});
