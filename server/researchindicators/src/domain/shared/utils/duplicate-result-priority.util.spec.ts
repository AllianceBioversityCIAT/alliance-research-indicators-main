import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import {
  DuplicateGroupClassification,
  DuplicateGroupParticipant,
  DuplicateRule,
  evaluateDuplicateResults,
  resolveDuplicateGroup,
  resolveDuplicatePair,
  normalizePublicLink,
  resolveDuplicateWinner,
} from './duplicate-result-priority.util';

const { PRMS, TIP, AICCRA } = ReportingPlatformEnum;
const KP = IndicatorsEnum.KNOWLEDGE_PRODUCT;
const CS = IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;
const INNOV = IndicatorsEnum.INNOVATION_DEV;

const row = (
  resultId: number,
  platformCode: ReportingPlatformEnum,
  indicatorId: IndicatorsEnum,
  reportYearId?: number,
): DuplicateGroupParticipant => ({
  resultId,
  platformCode,
  indicatorId,
  reportYearId,
});

/** All permutations of an array — used to prove order-independence. */
const permutations = <T>(items: T[]): T[][] => {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
};

const ids = (rows: DuplicateGroupParticipant[]) =>
  rows.map((r) => r.resultId).sort((a, b) => Number(a) - Number(b));

/**
 * Asserts the COMPLETE partition of a group — winner, losers, untouched — and
 * re-asserts it for every permutation of the participants.
 *
 * Naming every row's fate is the point. Two revisions of this resolver shipped a
 * data-loss defect because the test asserted that one row was safe and left the
 * others untraced: in `{AICCRA CS, TIP KP, TIP non-KP}` the old test checked only
 * that the TIP non-KP row survived, while the implementation silently deleted the
 * Capacity Sharing row that Rule 3 says prevails.
 */
const expectPartition = (
  participants: DuplicateGroupParticipant[],
  expected: {
    classification: DuplicateGroupClassification;
    winner: number | null;
    losers: number[];
    untouched: number[];
    rule?: DuplicateRule;
  },
  options?: { flagCrossYear?: boolean },
) => {
  for (const permutation of permutations(participants)) {
    const order = permutation.map((p) => p.resultId).join(',');
    const result = resolveDuplicateGroup(permutation, options);

    expect({ order, classification: result.classification }).toEqual({
      order,
      classification: expected.classification,
    });
    expect({ order, winner: result.winner?.resultId ?? null }).toEqual({
      order,
      winner: expected.winner,
    });
    expect({ order, losers: ids(result.losers) }).toEqual({
      order,
      losers: [...expected.losers].sort((a, b) => a - b),
    });
    expect({ order, untouched: ids(result.untouched) }).toEqual({
      order,
      untouched: [...expected.untouched].sort((a, b) => a - b),
    });

    // The partition must be disjoint and complete: losers + untouched covers
    // every participant exactly once. `survivors` is informational and is a
    // subset of `untouched`, so it is excluded from the accounting.
    const accounted = [...result.losers, ...result.untouched].map(
      (r) => r.resultId,
    );
    expect({
      order,
      survivorsSubsetOfUntouched: result.survivors.every((s) =>
        result.untouched.includes(s),
      ),
    }).toEqual({ order, survivorsSubsetOfUntouched: true });
    expect({ order, accounted: [...new Set(accounted)].sort() }).toEqual({
      order,
      accounted: participants.map((p) => p.resultId).sort(),
    });
    expect({ order, count: accounted.length }).toEqual({
      order,
      count: participants.length,
    });

    if (expected.rule) {
      expect({ order, rule: result.rule }).toEqual({
        order,
        rule: expected.rule,
      });
    }
  }
};

describe('resolveDuplicatePair', () => {
  it('Rule 1 — TIP prevails over PRMS and over AICCRA', () => {
    expect(
      resolveDuplicatePair(
        { platformCode: TIP, indicatorId: KP },
        { platformCode: PRMS, indicatorId: KP },
      ),
    ).toEqual({ winner: 'left', rule: DuplicateRule.RULE_1_TIP });
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: INNOV },
        { platformCode: TIP, indicatorId: INNOV },
      ),
    ).toEqual({ winner: 'right', rule: DuplicateRule.RULE_1_TIP });
  });

  it('Rule 2 — AICCRA prevails over PRMS when TIP is not involved', () => {
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: KP },
        { platformCode: PRMS, indicatorId: KP },
      ),
    ).toEqual({ winner: 'left', rule: DuplicateRule.RULE_2_AICCRA });
  });

  it('Rule 3 — AICCRA Capacity Sharing prevails over a PRMS/TIP Knowledge Product', () => {
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: PRMS, indicatorId: KP },
      ),
    ).toEqual({ winner: 'left', rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP });
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: TIP, indicatorId: KP },
      ),
    ).toEqual({ winner: 'left', rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP });
  });

  it('Rule 3 is scoped to Knowledge Product — a TIP non-KP row wins under Rule 1 (R-RES-002 AC.6)', () => {
    // OQ-1, closed: the shipped implementation applied Rule 3 to any PRMS/TIP
    // indicator, which deleted rows no approved rule authorized.
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: TIP, indicatorId: INNOV },
      ),
    ).toEqual({ winner: 'right', rule: DuplicateRule.RULE_1_TIP });
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: TIP, indicatorId: CS },
      ),
    ).toEqual({ winner: 'right', rule: DuplicateRule.RULE_1_TIP });
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: PRMS, indicatorId: IndicatorsEnum.OICR },
      ),
    ).toEqual({ winner: 'left', rule: DuplicateRule.RULE_2_AICCRA });
  });

  it('Rule 4 — two rows of one platform are not comparable', () => {
    expect(
      resolveDuplicatePair(
        { platformCode: TIP, indicatorId: KP },
        { platformCode: TIP, indicatorId: INNOV },
      ),
    ).toBeNull();
    expect(
      resolveDuplicatePair(
        { platformCode: AICCRA, indicatorId: CS },
        { platformCode: AICCRA, indicatorId: KP },
      ),
    ).toBeNull();
  });
});

describe('resolveDuplicateGroup — two-row compositions', () => {
  it('TIP prevails over PRMS', () => {
    expectPartition([row(1, TIP, KP), row(2, PRMS, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
      rule: DuplicateRule.RULE_1_TIP,
    });
  });

  it('TIP prevails over a non-Capacity-Sharing AICCRA row', () => {
    expectPartition([row(1, TIP, INNOV), row(2, AICCRA, INNOV)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
      rule: DuplicateRule.RULE_1_TIP,
    });
  });

  it('AICCRA prevails over PRMS when TIP is absent', () => {
    expectPartition([row(1, AICCRA, KP), row(2, PRMS, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
      rule: DuplicateRule.RULE_2_AICCRA,
    });
  });

  it('AICCRA Capacity Sharing prevails over a PRMS Knowledge Product', () => {
    expectPartition([row(1, AICCRA, CS), row(2, PRMS, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
      rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP,
    });
  });

  it('AICCRA Capacity Sharing prevails over a TIP Knowledge Product', () => {
    expectPartition([row(1, AICCRA, CS), row(2, TIP, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
      rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP,
    });
  });

  it('AICCRA Capacity Sharing does NOT prevail over a TIP non-KP row (AC.6)', () => {
    expectPartition([row(1, AICCRA, CS), row(2, TIP, INNOV)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 2,
      losers: [1],
      untouched: [2],
      rule: DuplicateRule.RULE_1_TIP,
    });
  });
});

describe('resolveDuplicateGroup — contradictory compositions delete nothing (OQ-9)', () => {
  // Both compositions below were hard-deleting a protected row in earlier
  // revisions. Each is reachable: §0.1 of the design measures one live group
  // already holding three same-platform rows.

  it('{AICCRA CS, TIP KP, TIP non-KP} — reports a conflict and deletes nothing', () => {
    // Rule 3 gives AICCRA the win over TIP KP; Rule 1 gives TIP non-KP the win
    // over AICCRA. Keeping the TIP sibling (Gate A) and deleting AICCRA would
    // contradict Rule 3, so the whole group is reported.
    expectPartition([row(1, AICCRA, CS), row(2, TIP, KP), row(3, TIP, INNOV)], {
      classification: DuplicateGroupClassification.UNRESOLVED_CONFLICT,
      winner: null,
      losers: [],
      untouched: [1, 2, 3],
    });
  });

  it('{AICCRA CS, AICCRA non-CS, TIP KP} — reports a conflict and deletes nothing', () => {
    expectPartition(
      [row(1, AICCRA, CS), row(2, AICCRA, INNOV), row(3, TIP, KP)],
      {
        classification: DuplicateGroupClassification.UNRESOLVED_CONFLICT,
        winner: null,
        losers: [],
        untouched: [1, 2, 3],
      },
    );
  });

  it('detects the conflict when the INCOMING row is the one that would be destroyed', () => {
    // Incoming AICCRA CS, stored TIP KP + TIP non-KP. The incoming row prevails
    // over TIP KP under Rule 3 but loses to TIP non-KP under Rule 1, so creating
    // it would be declined while the row it beats is kept.
    const result = resolveDuplicateGroup([
      { resultId: null, platformCode: AICCRA, indicatorId: CS },
      row(2, TIP, KP),
      row(3, TIP, INNOV),
    ]);
    expect(result.classification).toBe(
      DuplicateGroupClassification.UNRESOLVED_CONFLICT,
    );
    expect(result.losers).toEqual([]);
    expect(result.reason).toContain('Result incoming would be deleted');
  });

  it('detects the conflict when the INCOMING row is the one being kept', () => {
    // Incoming TIP KP, stored AICCRA CS + TIP non-KP. The incoming row is kept
    // by Gate A (same platform as the survivor), and the stored AICCRA row that
    // prevails over it must therefore not be deleted.
    const result = resolveDuplicateGroup([
      { resultId: null, platformCode: TIP, indicatorId: KP },
      row(2, AICCRA, CS),
      row(3, TIP, INNOV),
    ]);
    expect(result.classification).toBe(
      DuplicateGroupClassification.UNRESOLVED_CONFLICT,
    );
    expect(result.losers).toEqual([]);
    expect(result.reason).toContain('prevails over kept result(s) incoming');
  });

  it('explains which prevailing row would have been destroyed', () => {
    const result = resolveDuplicateGroup([
      row(1, AICCRA, CS),
      row(2, TIP, KP),
      row(3, TIP, INNOV),
    ]);
    expect(result.reason).toContain('prevails over kept result');
    expect(result.reason).toContain('OQ-9');
  });
});

describe('resolveDuplicateGroup — consistent three-row compositions still resolve', () => {
  it('{AICCRA CS, PRMS KP, TIP KP} resolves — AICCRA > TIP > PRMS is a total order', () => {
    // Guards against an over-conservative gate. TIP wins one pair and loses
    // another, which is the normal position of a middle element and NOT a
    // contradiction. A gate keyed on win-and-lose would wrongly refuse this.
    expectPartition([row(1, AICCRA, CS), row(2, PRMS, KP), row(3, TIP, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2, 3],
      untouched: [1],
      rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP,
    });
  });

  it('two same-platform survivors keep each other but the cross-platform loser is still deleted', () => {
    expectPartition([row(1, TIP, KP), row(2, TIP, INNOV), row(3, PRMS, KP)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: null,
      losers: [3],
      untouched: [1, 2],
    });
  });
});

describe('resolveDuplicateGroup — non-conflicts', () => {
  it('same-platform-only groups are never corrected (R-RES-005)', () => {
    expectPartition([row(1, PRMS, KP), row(2, PRMS, KP)], {
      classification: DuplicateGroupClassification.SAME_SYSTEM_IGNORED,
      winner: null,
      losers: [],
      untouched: [1, 2],
    });
  });

  it('three same-platform rows are never corrected', () => {
    expectPartition([row(1, TIP, KP), row(2, TIP, KP), row(3, TIP, INNOV)], {
      classification: DuplicateGroupClassification.SAME_SYSTEM_IGNORED,
      winner: null,
      losers: [],
      untouched: [1, 2, 3],
    });
  });

  it('a single participant is no conflict', () => {
    expectPartition([row(1, TIP, KP)], {
      classification: DuplicateGroupClassification.NO_CONFLICT,
      winner: null,
      losers: [],
      untouched: [1],
    });
  });

  it('an empty group is no conflict', () => {
    const result = resolveDuplicateGroup([]);
    expect(result.classification).toBe(
      DuplicateGroupClassification.NO_CONFLICT,
    );
    expect(result.losers).toEqual([]);
  });
});

describe('resolveDuplicateGroup — report-year scope (R-RES-006)', () => {
  it('flags a cross-year group for review and deletes nothing', () => {
    expectPartition(
      [row(1, TIP, KP, 2025), row(2, AICCRA, KP, 2024)],
      {
        classification: DuplicateGroupClassification.CROSS_YEAR_REVIEW,
        winner: null,
        losers: [],
        untouched: [1, 2],
      },
      { flagCrossYear: true },
    );
  });

  it('resolves a same-year group normally under the same option', () => {
    expectPartition(
      [row(1, TIP, KP, 2025), row(2, AICCRA, KP, 2025)],
      {
        classification: DuplicateGroupClassification.RESOLVED,
        winner: 1,
        losers: [2],
        untouched: [1],
      },
      { flagCrossYear: true },
    );
  });

  it('ignores report years on the sync path, which matches within one year', () => {
    expectPartition([row(1, TIP, KP, 2025), row(2, AICCRA, KP, 2024)], {
      classification: DuplicateGroupClassification.RESOLVED,
      winner: 1,
      losers: [2],
      untouched: [1],
    });
  });
});

describe('resolveDuplicateGroup — a prospective incoming row', () => {
  it('treats a null resultId as a participant and can mark it the loser', () => {
    const result = resolveDuplicateGroup([
      { resultId: null, platformCode: PRMS, indicatorId: KP },
      row(10, TIP, KP),
    ]);
    expect(result.classification).toBe(DuplicateGroupClassification.RESOLVED);
    expect(result.winner?.resultId).toBe(10);
    expect(result.losers.map((l) => l.resultId)).toEqual([null]);
  });

  it('can mark a prospective row the winner over a stored row', () => {
    const result = resolveDuplicateGroup([
      { resultId: null, platformCode: TIP, indicatorId: KP },
      row(20, PRMS, KP),
    ]);
    expect(result.winner?.resultId).toBeNull();
    expect(result.losers.map((l) => l.resultId)).toEqual([20]);
  });
});

describe('resolveDuplicateGroup — out-of-scope platforms refuse rather than guess', () => {
  // DUPLICATE_RESULT_PLATFORMS excludes STAR and BILATERAL, and the candidate
  // query filters to the three in-scope platforms. The pure resolver does not
  // enforce that, so these cases pin what happens if a caller ever passes one:
  // it declines, and never deletes on a comparison no rule decided.
  const BILATERAL = ReportingPlatformEnum.BILATERAL;

  it('no rule decides a PRMS/BILATERAL pair, so nothing is deleted', () => {
    expect(
      resolveDuplicatePair(
        { platformCode: PRMS, indicatorId: KP },
        { platformCode: BILATERAL, indicatorId: KP },
      ),
    ).toBeNull();

    expectPartition([row(1, PRMS, KP), row(2, BILATERAL, KP)], {
      classification: DuplicateGroupClassification.NO_CONFLICT,
      winner: null,
      losers: [],
      untouched: [1, 2],
    });
  });

  it('refuses when rows of two platforms both lose nothing', () => {
    // AICCRA CS beats the PRMS KP under Rule 3, but no rule compares either of
    // them with the BILATERAL row, so two platforms lose nothing. The resolver
    // reports a conflict instead of picking one — the safety net that keeps a
    // future rule change from turning into arbitrary deletion.
    expectPartition(
      [row(1, AICCRA, CS), row(2, BILATERAL, KP), row(3, PRMS, KP)],
      {
        classification: DuplicateGroupClassification.UNRESOLVED_CONFLICT,
        winner: null,
        losers: [],
        untouched: [1, 2, 3],
      },
    );
  });
});

describe('normalizePublicLink (legacy trim-only)', () => {
  it('trims and treats blank values as no link', () => {
    expect(normalizePublicLink('  https://doi.org/10.1234/abc  ')).toBe(
      'https://doi.org/10.1234/abc',
    );
    expect(normalizePublicLink('   ')).toBeNull();
    expect(normalizePublicLink('')).toBeNull();
    expect(normalizePublicLink(null)).toBeNull();
    expect(normalizePublicLink(undefined)).toBeNull();
  });

  it('does NOT normalize scheme, host case, or trailing slash', () => {
    // Deliberate: T-04 owns real normalization, applied symmetrically in SQL
    // with an explicit binary collation. This helper only exists for the
    // not-yet-reworked SaveResultService.
    expect(normalizePublicLink('HTTPS://DOI.ORG/x/')).toBe(
      'HTTPS://DOI.ORG/x/',
    );
  });
});

// ---------------------------------------------------------------------------
// Legacy pairwise API — retained until T-06 moves SaveResultService onto the
// group resolver. Expectations marked (OQ-1) inverted when Rule 3 was narrowed
// to Knowledge Product: they previously asserted the over-broad behavior.
// ---------------------------------------------------------------------------

describe('resolveDuplicateWinner (legacy)', () => {
  const kp = (platformCode: ReportingPlatformEnum) => ({
    platformCode,
    indicatorId: KP,
  });
  const cs = (platformCode: ReportingPlatformEnum) => ({
    platformCode,
    indicatorId: CS,
  });

  it('TIP prevails over PRMS', () => {
    expect(resolveDuplicateWinner(kp(TIP), kp(PRMS))).toBe('incoming');
    expect(resolveDuplicateWinner(kp(PRMS), kp(TIP))).toBe('existing');
  });

  it('TIP prevails over AICCRA when AICCRA is not Capacity Sharing', () => {
    const tip = { platformCode: TIP, indicatorId: INNOV };
    const aiccra = { platformCode: AICCRA, indicatorId: INNOV };
    expect(resolveDuplicateWinner(tip, aiccra)).toBe('incoming');
    expect(resolveDuplicateWinner(aiccra, tip)).toBe('existing');
  });

  it('AICCRA prevails over PRMS when TIP is not involved', () => {
    expect(resolveDuplicateWinner(kp(AICCRA), kp(PRMS))).toBe('incoming');
    expect(resolveDuplicateWinner(kp(PRMS), kp(AICCRA))).toBe('existing');
  });

  it('AICCRA Capacity Sharing prevails over a PRMS/TIP Knowledge Product', () => {
    expect(resolveDuplicateWinner(cs(AICCRA), kp(PRMS))).toBe('incoming');
    expect(resolveDuplicateWinner(cs(AICCRA), kp(TIP))).toBe('incoming');
    expect(resolveDuplicateWinner(kp(TIP), cs(AICCRA))).toBe('existing');
  });

  it('(OQ-1) TIP Capacity Sharing now prevails over AICCRA Capacity Sharing', () => {
    // Rule 3 requires the PRMS/TIP side to be a Knowledge Product. A TIP
    // Capacity Sharing row is therefore decided by Rule 1, and TIP wins. The
    // previous expectations here were 'existing'/'incoming' respectively.
    expect(resolveDuplicateWinner(cs(TIP), cs(AICCRA))).toBe('incoming');
    expect(resolveDuplicateWinner(cs(AICCRA), cs(TIP))).toBe('existing');
  });

  it('same-platform rows let the sync proceed', () => {
    expect(resolveDuplicateWinner(kp(TIP), kp(TIP))).toBe('incoming');
  });
});

describe('evaluateDuplicateResults (legacy adapter)', () => {
  it('omits an incoming PRMS row when a TIP duplicate is stored', () => {
    const result = evaluateDuplicateResults(
      { platformCode: PRMS, indicatorId: KP },
      [{ resultId: 10, platformCode: TIP, indicatorId: KP }],
    );
    expect(result.shouldOmit).toBe(true);
    expect(result.resultsToDelete).toEqual([]);
  });

  it('marks lower-priority duplicates for deletion when the incoming TIP row wins', () => {
    const result = evaluateDuplicateResults(
      { platformCode: TIP, indicatorId: KP },
      [
        { resultId: 20, platformCode: PRMS, indicatorId: KP },
        { resultId: 30, platformCode: AICCRA, indicatorId: INNOV },
      ],
    );
    expect(result.shouldOmit).toBe(false);
    expect(result.resultsToDelete.sort()).toEqual([20, 30]);
  });

  it('does not delete duplicates referenced in link_results', () => {
    const result = evaluateDuplicateResults(
      { platformCode: TIP, indicatorId: KP },
      [{ resultId: 40, platformCode: PRMS, indicatorId: KP }],
      [40],
    );
    expect(result.resultsToDelete).toEqual([]);
    expect(result.protectedFromDeletion).toEqual([40]);
  });

  it('(OQ-1) does NOT omit an incoming TIP Capacity Sharing row against stored AICCRA Capacity Sharing', () => {
    // Previously asserted shouldOmit === true under the over-broad Rule 3.
    const result = evaluateDuplicateResults(
      { platformCode: TIP, indicatorId: CS },
      [{ resultId: 50, platformCode: AICCRA, indicatorId: CS }],
    );
    expect(result.shouldOmit).toBe(false);
    expect(result.resultsToDelete).toEqual([50]);
  });

  it('inherits the conflict gate — a contradictory group omits nothing and deletes nothing', () => {
    // The legacy signature cannot express Gate A/Gate B, but routing through the
    // group resolver means it can no longer destroy a prevailing row either.
    const result = evaluateDuplicateResults(
      { platformCode: TIP, indicatorId: INNOV },
      [
        { resultId: 60, platformCode: AICCRA, indicatorId: CS },
        { resultId: 61, platformCode: TIP, indicatorId: KP },
      ],
    );
    expect(result.shouldOmit).toBe(false);
    expect(result.resultsToDelete).toEqual([]);
    expect(result.protectedFromDeletion).toEqual([]);
  });
});
