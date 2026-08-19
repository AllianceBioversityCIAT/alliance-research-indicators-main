/**
 * The fidelity check — [SPEC bilateral/clarisa-fixture-stub] T-04.
 *
 * The KZ-001 gate the whole spec rests on: a double (the fixture) that doesn't evaluate the
 * way the thing it stands in for evaluates is worse than no double, because the suite goes
 * green over broken behaviour. This file compares the generated, committed fixture
 * (`clarisa-projects.fixture.json`) against the committed, real reference capture
 * (`clarisa-reference-capture.json`) and the committed dictionary — never against a
 * hand-written expectation, per `tdd`'s anti-tautological rule and DD-4 (the reference
 * capture is the only independent oracle available; nothing here is mocked).
 *
 * Requirements covered: R-CFS-005 (all ACs + scenario), R-CFS-001 AC.2, R-CFS-002
 * AC.2/AC.3/AC.4/AC.5. Design refs: §10, DD-2, DD-4.
 *
 * ---------------------------------------------------------------------------------------
 * Two-layer design (Leader interpretation, execution.md T-04 brief)
 * ---------------------------------------------------------------------------------------
 * "Assert the divergence list is a closed set of exactly eight" has no clean mechanical
 * reading — auto-diffing the fixture against the reference would not yield exactly 8 (D-7,
 * "PI fields dropped", isn't a fixture-vs-reference divergence at all: CLARISA never had
 * those fields either). So this file implements two layers instead:
 *
 *   Layer 1 — eight named assertions ("D-1 recorded divergences" below), one per D-row in
 *   requirements.md §R-CFS-005, each documenting the divergence and asserting it still holds
 *   AS DESCRIBED. If a D-row stops being true, that specific check fails.
 *
 *   Layer 2 — a generic structural guard that catches what the eight do not: key-set
 *   equality in both directions (project- and mapping-level), and one cross-side invariant
 *   (`short_name === full_name`, "the real feed's own invariant" per convert-export.ts's
 *   header comment) that isn't one of D-1..D-8. This is the layer a NINTH divergence must
 *   fail — not an enumeration.
 *
 * Scoping note on Layer 2 (read before extending it). A literal per-field type-domain
 * comparison against literally all 32 keys was tried and rejected: `description`,
 * `start_date` and `end_date` all show a different type domain between the 198-row fixture
 * and the 5-row reference capture, and none of the three is one of D-1..D-8. All three are
 * sample-size noise — the reference capture is a 5-project sample and the fixture's 198 rows
 * simply never hit a blank cell the small sample happens to show. They stay excluded from
 * Layer 2 for that reason: a literal comparison here would fail this spec against the
 * CURRENT, already-reviewed, committed fixture over an artefact of sample size, not a real
 * divergence.
 *
 * `organization_code` and `funder_code` were ORIGINALLY excluded on the same "read by
 * nothing" reasoning T-02's Reviewer applied to `annual`/`comments` — but that precedent does
 * not cross the line design §5.2 step 3 draws: *"Map the fields the export supplies; set the
 * rest to the value CLARISA returns."* `annual` sits in the first half (the export supplies
 * it); `organization_code`/`funder_code` sit in the second (nulled because no institution-id
 * dictionary exists — the same shape as D-6). T-04's Reviewer ruled the omission a FAIL and
 * the Leader amended requirements.md with a **D-8** row (2026-08-19). They are now covered by
 * Layer 1's D-8 assertion below, not excluded from Layer 2 — the three sampling artefacts
 * above are the only fields that remain deliberately out of scope.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  isBilateralFunding,
  isAllianceProject,
  matchesPhase,
} from '../projects/utils/project-selector.util';
import type {
  ClarisaProject,
  ClarisaGlobalUnit,
} from '../projects/dto/clarisa-project.types';

const FIXTURES_DIR = join(__dirname, 'fixtures');
const TARGET_PHASE = 2026;

// `ClarisaProject` deliberately narrows to the fields the consumption path reads (its own
// header comment: "add them here on first need"). This check compares the FULL 32-key
// contract, including fields nothing reads yet (`interim_director_review`, `project_results`
// — D-5) — so fixture/reference elements are typed as the shipped DTO widened with an index
// signature, never re-declared from scratch.
type FixtureProject = ClarisaProject & Record<string, unknown>;

function loadJson<T>(filename: string): T {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, filename), 'utf-8')) as T;
}

function loadFixture(): FixtureProject[] {
  return loadJson<FixtureProject[]>('clarisa-projects.fixture.json');
}

function loadReference(): FixtureProject[] {
  return loadJson<FixtureProject[]>('clarisa-reference-capture.json');
}

function loadDictionary(): Record<string, ClarisaGlobalUnit> {
  return loadJson<Record<string, ClarisaGlobalUnit>>(
    'clarisa-global-units.dictionary.json',
  );
}

/** Deep clone via JSON round-trip — mutation tests below run on a fresh, unshared copy;
 * the committed files on disk are never written to. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function keysOf(obj: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(obj));
}

/**
 * Asserts SET equality — in both directions — between `actual`'s keys and `expected`. A
 * missing key and an extra key are different defects (R-CFS-001 AC.2); the message names
 * both, distinctly, rather than collapsing them into one "keys differ" verdict.
 *
 * Forward pointer from T-01's review: T-01's `assertKeyCount` only checked each reference
 * project's key COUNT (32), never that every element shares the same 32-key SET. This
 * function is the one that actually asserts set equality, not count equality.
 */
function assertKeySetEquals(
  actual: Record<string, unknown>,
  expected: Set<string>,
  label: string,
): void {
  const actualKeys = keysOf(actual);
  const missing = [...expected].filter((k) => !actualKeys.has(k));
  const extra = [...actualKeys].filter((k) => !expected.has(k));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label}: key-set mismatch. Missing: [${missing.join(', ')}]. Extra: [${extra.join(', ')}].`,
    );
  }
}

/** R-CFS-002's behavioural core — the exact predicate `ClarisaProjectsService` evaluates. */
function hasSciencePrograms(project: FixtureProject): boolean {
  return (project.project_mappings_array ?? []).some(
    (m) =>
      m.status === 'Confirmed' &&
      m.global_unit_object?.cgiar_entity_type_object?.code === 22,
  );
}

/** The eligible cohort, using the SHIPPED predicates — never a local reimplementation, per
 * the T-04 brief and T-01/T-02's forward pointer, or this check drifts from the code it is
 * defending. */
function eligibleProjects(fixture: FixtureProject[]): FixtureProject[] {
  return fixture.filter(
    (p) =>
      isBilateralFunding(p.source_of_funding) &&
      isAllianceProject(p) &&
      matchesPhase(p.phase ?? null, TARGET_PHASE),
  );
}

// ---------------------------------------------------------------------------------------
// Reusable checkers — each is called both against the real committed data (must NOT throw)
// and, in the "K-004" describe block below, against a deliberately mutated in-memory clone
// (must throw). Reusing the exact same function in both places is what makes the mutation
// tests genuine evidence rather than a parallel, looser check that happens to also exist.
// ---------------------------------------------------------------------------------------

function assertHasScienceProgramsCount(fixture: FixtureProject[]): void {
  const eligible = eligibleProjects(fixture);
  const trueCount = eligible.filter(hasSciencePrograms).length;
  if (trueCount !== 140) {
    throw new Error(
      `has_science_programs true count: expected 140, got ${trueCount} ` +
        `(eligible cohort size ${eligible.length}).`,
    );
  }
}

function assertFixtureKeysMatchReference(
  fixture: FixtureProject[],
  reference: FixtureProject[],
): void {
  const referenceKeys = keysOf(
    reference[0] as unknown as Record<string, unknown>,
  );
  fixture.forEach((p, i) =>
    assertKeySetEquals(
      p as unknown as Record<string, unknown>,
      referenceKeys,
      `fixture[${i}]`,
    ),
  );
}

function assertPhaseType(fixture: FixtureProject[]): void {
  fixture.forEach((p, i) => {
    if (typeof p.phase !== 'number') {
      throw new Error(
        `fixture[${i}].phase: expected type number, got ${typeof p.phase} (${JSON.stringify(p.phase)}).`,
      );
    }
  });
}

/** Layer 1 registry — the eight divergences this check treats as a CLOSED, recorded set. If
 * any of these stops being true, the failure message says "Recorded divergence(s)
 * regressed", distinct from Layer 2's "new divergence" wording. */
function assertRecordedDivergencesStillHold(
  fixture: FixtureProject[],
  reference: FixtureProject[],
): void {
  const failures: string[] = [];

  if (
    !fixture.every(
      (p) =>
        typeof p.source_center_acronym === 'string' &&
        p.source_center_acronym.length > 0,
    )
  ) {
    failures.push(
      'D-1: source_center_acronym is no longer populated in every fixture project',
    );
  }
  if (!reference.every((p) => p.source_center_acronym === null)) {
    failures.push(
      'D-1: source_center_acronym is no longer null in every reference-capture project',
    );
  }

  const fixturePhases = new Set(fixture.map((p) => p.phase));
  if (!(fixturePhases.size === 1 && fixturePhases.has(TARGET_PHASE))) {
    failures.push(
      'D-2: the fixture no longer carries a single phase value (2026)',
    );
  }

  const fixtureFundingVocab = new Set(
    fixture.map((p) => (p.source_of_funding ?? '').trim().toLowerCase()),
  );
  if (
    fixtureFundingVocab.size !== 2 ||
    !fixtureFundingVocab.has('bilateral') ||
    !fixtureFundingVocab.has('window3')
  ) {
    failures.push(
      'D-3: the fixture funding-source vocabulary is no longer exactly {bilateral, window3}',
    );
  }

  const mappingStatuses = new Set(
    fixture.flatMap((p) =>
      (p.project_mappings_array ?? []).map((m) => m.status),
    ),
  );
  if (!(mappingStatuses.size === 1 && mappingStatuses.has('Confirmed'))) {
    failures.push('D-4: not every fixture mapping is Confirmed anymore');
  }

  if (!fixture.every((p) => p.interim_director_review === null)) {
    failures.push(
      'D-5: interim_director_review is no longer always null in the fixture',
    );
  }
  if (!fixture.every((p) => p.project_results === null)) {
    failures.push(
      'D-5: project_results is no longer always null in the fixture',
    );
  }
  if (
    !reference.some((p) => p.interim_director_review !== null) ||
    !reference.some((p) => p.project_results !== null)
  ) {
    failures.push(
      'D-5: the reference capture no longer demonstrates a populated real value',
    );
  }

  if (!fixture.every((p) => p.lead_institution_object === null)) {
    failures.push(
      'D-6: lead_institution_object is no longer always null in the fixture',
    );
  }
  if (!fixture.every((p) => p.funder_institution_object === null)) {
    failures.push(
      'D-6: funder_institution_object is no longer always null in the fixture',
    );
  }
  if (
    !reference.some((p) => p.lead_institution_object !== null) ||
    !reference.some((p) => p.funder_institution_object !== null)
  ) {
    failures.push(
      'D-6: the reference capture no longer demonstrates a populated real value',
    );
  }

  const piPattern = /principal.?investigator/i;
  const hasPiKey = (arr: FixtureProject[]) =>
    arr.some((p) => Object.keys(p).some((k) => piPattern.test(k)));
  if (hasPiKey(fixture) || hasPiKey(reference)) {
    failures.push(
      'D-7: a Principal Investigator field has appeared on one side',
    );
  }

  if (!fixture.every((p) => p.organization_code === null)) {
    failures.push(
      'D-8: organization_code is no longer always null in the fixture',
    );
  }
  if (!fixture.every((p) => p.funder_code === null)) {
    failures.push('D-8: funder_code is no longer always null in the fixture');
  }
  // AC.2b's asymmetry: only `organization_code`'s reference side is asserted populated.
  // `funder_code` is populated in just 1 of the 5 reference projects — a `some(… !== null)`
  // guard on it would be an n=5 sampling artefact, not a divergence check.
  if (!reference.some((p) => p.organization_code !== null)) {
    failures.push(
      'D-8: the reference capture no longer demonstrates a populated organization_code value',
    );
  }

  if (failures.length > 0) {
    throw new Error(
      `Recorded divergence(s) regressed:\n  - ${failures.join('\n  - ')}`,
    );
  }
}

/** Layer 2 — the generic net. A break here is, by construction, NOT one of D-1..D-8: it is
 * a ninth (or later) divergence, caught by structure rather than by name. */
function assertNoUnrecordedDivergence(
  fixture: FixtureProject[],
  reference: FixtureProject[],
): void {
  const violations: string[] = [];

  const referenceKeys = keysOf(
    reference[0] as unknown as Record<string, unknown>,
  );
  reference.forEach((p, i) => {
    try {
      assertKeySetEquals(
        p as unknown as Record<string, unknown>,
        referenceKeys,
        `reference[${i}]`,
      );
    } catch (err) {
      violations.push((err as Error).message);
    }
  });
  fixture.forEach((p, i) => {
    try {
      assertKeySetEquals(
        p as unknown as Record<string, unknown>,
        referenceKeys,
        `fixture[${i}]`,
      );
    } catch (err) {
      violations.push((err as Error).message);
    }
  });

  const referenceMappingKeys = keysOf(
    (
      reference[0].project_mappings_array as unknown as Record<
        string,
        unknown
      >[]
    )[0],
  );
  const allMappings = (arr: FixtureProject[]) =>
    arr.flatMap((p) => p.project_mappings_array ?? []);
  allMappings(reference).forEach((m, i) => {
    try {
      assertKeySetEquals(
        m as unknown as Record<string, unknown>,
        referenceMappingKeys,
        `reference mapping[${i}]`,
      );
    } catch (err) {
      violations.push((err as Error).message);
    }
  });
  allMappings(fixture).forEach((m, i) => {
    try {
      assertKeySetEquals(
        m as unknown as Record<string, unknown>,
        referenceMappingKeys,
        `fixture mapping[${i}]`,
      );
    } catch (err) {
      violations.push((err as Error).message);
    }
  });

  // The one cross-side invariant Layer 2 checks beyond structure: "Name → short_name AND
  // full_name (verbatim, same value on both sides in the real feed)" per convert-export.ts's
  // header comment, and independently true of the committed reference capture. Not one of
  // D-1..D-8 — a break here is exactly the "ninth divergence" shape.
  if (!fixture.every((p) => p.short_name === p.full_name)) {
    violations.push(
      'short_name/full_name are no longer identical on every fixture project ' +
        "(matches the real feed's own invariant; not one of the eight recorded divergences)",
    );
  }
  if (!reference.every((p) => p.short_name === p.full_name)) {
    violations.push(
      'short_name/full_name are no longer identical on every reference-capture project',
    );
  }

  if (violations.length > 0) {
    throw new Error(
      `Unrecorded (new) divergence detected — not one of the eight recorded in R-CFS-005:\n  - ${violations.join('\n  - ')}`,
    );
  }
}

// =========================================================================================
// The eight recorded divergences (Layer 1) — R-CFS-005
// =========================================================================================

describe('R-CFS-005 — the eight recorded divergences (closed set)', () => {
  it('D-1 — source_center_acronym is populated in every fixture project, null in every reference-capture project', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    expect(
      fixture.every(
        (p) =>
          typeof p.source_center_acronym === 'string' &&
          p.source_center_acronym!.length > 0,
      ),
    ).toBe(true);
    expect(reference.every((p) => p.source_center_acronym === null)).toBe(true);
  });

  it('D-2 — the fixture carries a single phase value (2026); the export has no phase column to vary it', () => {
    const fixture = loadFixture();
    const distinctPhases = new Set(fixture.map((p) => p.phase));
    expect(distinctPhases.size).toBe(1);
    expect(distinctPhases.has(TARGET_PHASE)).toBe(true);
  });

  it('D-3 — the fixture uses only two funding-source spellings; the reference capture already shows spellings the fixture cannot produce', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    const fixtureVocab = new Set(
      fixture.map((p) => (p.source_of_funding ?? '').trim().toLowerCase()),
    );
    expect(fixtureVocab).toEqual(new Set(['bilateral', 'window3']));

    const uncoveredSpellings = [
      ...new Set(reference.map((p) => p.source_of_funding)),
    ].filter((v) => !fixtureVocab.has((v ?? '').trim().toLowerCase()));
    expect(uncoveredSpellings.length).toBeGreaterThan(0);
  });

  it('D-4 — every fixture mapping is Confirmed; faithful to the real feed, but the non-Confirmed branch stays unexercised', () => {
    const fixture = loadFixture();
    const statuses = new Set(
      fixture.flatMap((p) =>
        (p.project_mappings_array ?? []).map((m) => m.status),
      ),
    );
    expect(statuses).toEqual(new Set(['Confirmed']));
  });

  it('D-5 — interim_director_review and project_results are always null in the fixture, though the reference capture carries real values', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    expect(fixture.every((p) => p.interim_director_review === null)).toBe(true);
    expect(fixture.every((p) => p.project_results === null)).toBe(true);
    expect(reference.some((p) => p.interim_director_review !== null)).toBe(
      true,
    );
    expect(reference.some((p) => p.project_results !== null)).toBe(true);
  });

  it('D-6 — lead_institution_object and funder_institution_object are always null in the fixture, though the reference capture carries real values', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    expect(fixture.every((p) => p.lead_institution_object === null)).toBe(true);
    expect(fixture.every((p) => p.funder_institution_object === null)).toBe(
      true,
    );
    expect(reference.some((p) => p.lead_institution_object !== null)).toBe(
      true,
    );
    expect(reference.some((p) => p.funder_institution_object !== null)).toBe(
      true,
    );
  });

  it('D-7 — no Principal Investigator field exists on either side; CLARISA never had a counterpart for it', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    const piPattern = /principal.?investigator/i;
    const hasPiKey = (arr: FixtureProject[]) =>
      arr.some((p) => Object.keys(p).some((k) => piPattern.test(k)));
    expect(hasPiKey(fixture)).toBe(false);
    expect(hasPiKey(reference)).toBe(false);
  });

  it('D-8 — organization_code and funder_code are always null in the fixture; the reference capture shows organization_code populated (funder_code is an n=5 sample, asserted fixture-side only)', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    expect(fixture.every((p) => p.organization_code === null)).toBe(true);
    expect(fixture.every((p) => p.funder_code === null)).toBe(true);
    // AC.2b: only organization_code's reference side is asserted populated (5/5). funder_code
    // is populated in just 1 of 5 reference projects — asserting `some(… !== null)` there
    // would test an n=5 sampling artefact, not a divergence, so it is deliberately omitted.
    expect(reference.some((p) => p.organization_code !== null)).toBe(true);
  });

  // R-CFS-005 AC.3 — the check reports the divergence list in its output, so a reader of a
  // passing run still sees the gaps even though every other assertion is green.
  it('prints the eight recorded divergences on success (R-CFS-005 AC.3)', () => {
    const DIVERGENCES = [
      [
        'D-1',
        'source_center_acronym populated in the fixture, null in CLARISA today',
      ],
      [
        'D-2',
        'single phase value (2026) — the multi-phase selector path is unexercised',
      ],
      [
        'D-3',
        "only two funding spellings vs CLARISA's eleven — messy-spelling tolerance unexercised",
      ],
      [
        'D-4',
        'all mappings Confirmed — the non-Confirmed branch is unexercised',
      ],
      [
        'D-5',
        'interim_director_review / project_results always null in the fixture',
      ],
      [
        'D-6',
        'lead_institution_object / funder_institution_object always null in the fixture',
      ],
      [
        'D-7',
        'Principal Investigator name/email dropped — no CLARISA counterpart',
      ],
      [
        'D-8',
        'organization_code / funder_code always null in the fixture — no institution-id dictionary exists',
      ],
    ] as const;

    console.log(
      '\n[clarisa-stub fidelity] Recorded divergences (closed set of 8):',
    );
    for (const [id, summary] of DIVERGENCES) {
      console.log(`  ${id}: ${summary}`);
    }
    expect(DIVERGENCES).toHaveLength(8);
  });
});

// =========================================================================================
// Required assertions — R-CFS-001/R-CFS-002 behavioural proof
// =========================================================================================

describe('Required assertions — R-CFS-001 / R-CFS-002', () => {
  it('key-set equality in both directions between fixture elements and reference-capture elements', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    const referenceKeys = keysOf(
      reference[0] as unknown as Record<string, unknown>,
    );

    // Guard the "expected" side first: every reference element must itself carry the same
    // key set, or the comparison below is unreliable (K-014 — check for an error before
    // counting).
    reference.forEach((p, i) =>
      assertKeySetEquals(
        p as unknown as Record<string, unknown>,
        referenceKeys,
        `reference[${i}]`,
      ),
    );
    fixture.forEach((p, i) =>
      assertKeySetEquals(
        p as unknown as Record<string, unknown>,
        referenceKeys,
        `fixture[${i}]`,
      ),
    );
  });

  it('has_science_programs is true for exactly 140 of the 170 eligible projects, false for 30 (R-CFS-002 AC.3)', () => {
    const fixture = loadFixture();
    const eligible = eligibleProjects(fixture);
    expect(eligible).toHaveLength(170);
    const trueCount = eligible.filter(hasSciencePrograms).length;
    expect(trueCount).toBe(140);
    expect(eligible.length - trueCount).toBe(30);
  });

  it('the entity-code histogram contains 22, 23 and 24 — never 22 alone (R-CFS-002 AC.2)', () => {
    const fixture = loadFixture();
    const codes = new Set<number>();
    for (const p of fixture) {
      for (const m of p.project_mappings_array ?? []) {
        codes.add(m.global_unit_object.cgiar_entity_type_object!.code);
      }
    }
    expect(codes.has(22)).toBe(true);
    expect(codes.has(23)).toBe(true);
    expect(codes.has(24)).toBe(true);
  });

  it('complementarity and efficiencies are drawn only from {high, medium, low} — no H/M/L across all 283 mappings (R-CFS-002 AC.4)', () => {
    const fixture = loadFixture();
    const vocab = new Set<string>();
    let mappingCount = 0;
    for (const p of fixture) {
      for (const m of p.project_mappings_array ?? []) {
        vocab.add(m.complementarity as string);
        vocab.add(m.efficiencies as string);
        mappingCount++;
      }
    }
    expect(mappingCount).toBe(283);
    expect(vocab).toEqual(new Set(['high', 'medium', 'low']));
  });

  it('allocation is numeric for all 283 mappings, and per-project allocations sum to 100 (R-CFS-002 AC.5)', () => {
    const fixture = loadFixture();
    let mappingCount = 0;
    for (const p of fixture) {
      const mappings = p.project_mappings_array ?? [];
      let sum = 0;
      for (const m of mappings) {
        expect(typeof m.allocation).toBe('number');
        sum += m.allocation;
        mappingCount++;
      }
      if (mappings.length > 0) {
        expect(sum).toBe(100);
      }
    }
    expect(mappingCount).toBe(283);
  });

  it('every global_unit_object is byte-equal to its dictionary entry (DD-2 oracle, R-CFS-002 AC.1)', () => {
    const fixture = loadFixture();
    const dictionary = loadDictionary();
    let checked = 0;
    for (const p of fixture) {
      for (const m of p.project_mappings_array ?? []) {
        const smoCode = m.global_unit_object.smo_code;
        const dictEntry = dictionary[smoCode];
        expect(dictEntry).toBeDefined();
        expect(JSON.stringify(m.global_unit_object)).toBe(
          JSON.stringify(dictEntry),
        );
        checked++;
      }
    }
    expect(checked).toBe(283);
  });

  it('phase is the number 2026 for all 198 projects; 198 projects, 283 mappings total (R-CFS-001 AC.1/AC.3)', () => {
    const fixture = loadFixture();
    expect(fixture).toHaveLength(198);
    expect(
      fixture.every(
        (p) => typeof p.phase === 'number' && p.phase === TARGET_PHASE,
      ),
    ).toBe(true);
    const mappingCount = fixture.reduce(
      (sum, p) => sum + (p.project_mappings_array ?? []).length,
      0,
    );
    expect(mappingCount).toBe(283);
  });
});

// =========================================================================================
// Layer 2 — generic structural guard (what catches a ninth divergence)
// =========================================================================================

describe('Layer 2 — generic structural guard', () => {
  it('every fixture and reference mapping carries exactly the reference mapping key-set, both directions', () => {
    const fixture = loadFixture();
    const reference = loadReference();
    const referenceMappingKeys = keysOf(
      (
        reference[0].project_mappings_array as unknown as Record<
          string,
          unknown
        >[]
      )[0],
    );
    reference
      .flatMap((p) => p.project_mappings_array ?? [])
      .forEach((m, i) =>
        assertKeySetEquals(
          m as unknown as Record<string, unknown>,
          referenceMappingKeys,
          `reference mapping[${i}]`,
        ),
      );
    fixture
      .flatMap((p) => p.project_mappings_array ?? [])
      .forEach((m, i) =>
        assertKeySetEquals(
          m as unknown as Record<string, unknown>,
          referenceMappingKeys,
          `fixture mapping[${i}]`,
        ),
      );
  });

  it("short_name and full_name are identical on every element, both sides — the real feed's own invariant", () => {
    const fixture = loadFixture();
    const reference = loadReference();
    expect(fixture.every((p) => p.short_name === p.full_name)).toBe(true);
    expect(reference.every((p) => p.short_name === p.full_name)).toBe(true);
  });

  it('external_code is populated and unique across all 198 — the one intentional key-level difference from the reference, not a D-row (R-CFS-001 AC.4)', () => {
    const fixture = loadFixture();
    const codes = fixture.map((p) => p.external_code);
    expect(codes.every((c) => typeof c === 'string' && c.length > 0)).toBe(
      true,
    );
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('the closed set holds: no unrecorded divergence against the real committed data', () => {
    expect(() =>
      assertNoUnrecordedDivergence(loadFixture(), loadReference()),
    ).not.toThrow();
  });
});

// =========================================================================================
// K-004 — named falsifying inputs. Each must be observed FAILING (task tasks.md T-04).
// Every mutation below runs on an in-memory clone; the committed fixture/reference files on
// disk are never modified.
// =========================================================================================

describe('K-004 — named falsifying inputs (the gate must be able to FAIL)', () => {
  it('mutation 1 (the headline) — hardcoding cgiar_entity_type_object.code=22 for every mapping makes has_science_programs report 170, not 140', () => {
    const mutated = clone(loadFixture());
    for (const p of mutated) {
      for (const m of p.project_mappings_array ?? []) {
        m.global_unit_object.cgiar_entity_type_object!.code = 22;
      }
    }
    expect(() => assertHasScienceProgramsCount(mutated)).toThrow(
      /has_science_programs true count: expected 140, got 170/,
    );
  });

  it('mutation 2 — adding principal_investigator_email to one fixture element breaks key-set equality (extra key)', () => {
    const mutated = clone(loadFixture());
    (
      mutated[0] as unknown as Record<string, unknown>
    ).principal_investigator_email = 'someone@example.org';
    const reference = loadReference();
    expect(() => assertFixtureKeysMatchReference(mutated, reference)).toThrow(
      /Extra: \[principal_investigator_email\]/,
    );
  });

  it('mutation 3 — removing "remaining" from one element breaks key-set equality in the other direction (missing key)', () => {
    const mutated = clone(loadFixture());
    delete (mutated[0] as unknown as Record<string, unknown>).remaining;
    const reference = loadReference();
    expect(() => assertFixtureKeysMatchReference(mutated, reference)).toThrow(
      /Missing: \[remaining\]/,
    );
  });

  it('mutation 4 — changing one phase to the string "2026" breaks the type assertion', () => {
    const mutated = clone(loadFixture());
    (mutated[0] as unknown as Record<string, unknown>).phase = '2026';
    expect(() => assertPhaseType(mutated)).toThrow(
      /expected type number, got string/,
    );
  });

  // Rework note (T-04 attempt 2): attempt 1's mutation 5 mutated `full_name`/`short_name` —
  // the ONE bespoke cross-side invariant Layer 2 was deliberately built to catch. The
  // Reviewer's finding: that falsifier was fitted to the net, not a genuine test of Layer 2's
  // GENERIC structural guard. `total_budget` is a field no D-row names and no bespoke
  // invariant covers — Layer 2 catches its removal only because the key-set-equality check is
  // field-agnostic by construction, not because anyone shaped a rule around this field.
  it('mutation 5 — dropping "total_budget" from one fixture element introduces a ninth divergence, caught by Layer 2\'s generic key-set net (a field no D-row and no bespoke invariant covers)', () => {
    const mutated = clone(loadFixture());
    delete (mutated[0] as unknown as Record<string, unknown>).total_budget;
    const reference = loadReference();
    expect(() => assertNoUnrecordedDivergence(mutated, reference)).toThrow(
      /Unrecorded \(new\) divergence detected/,
    );
    expect(() => assertNoUnrecordedDivergence(mutated, reference)).toThrow(
      /Missing: \[total_budget\]/,
    );
    // And the SAME mutated data must NOT trip the "recorded divergence regressed" path —
    // this is what makes the message genuinely distinguish "new" from "recorded", not just
    // use different words for the same failure.
    expect(() =>
      assertRecordedDivergencesStillHold(mutated, reference),
    ).not.toThrow();
  });

  // Not one of the five named inputs, but directly exercises the other half of R-CFS-005's
  // "AND IT MUST distinguish recorded from new" clause: a REGRESSED recorded divergence must
  // say "recorded", never "new".
  it('a regressed recorded divergence (D-1 stops holding) is reported as "recorded", not "new"', () => {
    const mutated = clone(loadFixture());
    mutated.forEach((p) => {
      p.source_center_acronym = null;
    });
    const reference = loadReference();
    expect(() =>
      assertRecordedDivergencesStillHold(mutated, reference),
    ).toThrow(/Recorded divergence\(s\) regressed/);
    expect(() =>
      assertNoUnrecordedDivergence(mutated, reference),
    ).not.toThrow();
  });
});
