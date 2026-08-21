// @akili-spec project-dashboard/indicator-metadata-charts
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { IndicatorMetadataReportsRepository } from './indicator-metadata-reports.repository';
import { buildPrimaryContractResultsScopeSql } from '../utils/primary-contract-results.util';
import { SessionFormatEnum } from '../../session-formats/enums/session-format.enum';
import { SessionLengthEnum } from '../../session-lengths/enum/session-lengths.enum';

/**
 * Doubles policy (`tasks.md` §4): **seeded fixtures over a mocked
 * `DataSource.query`**, plus targeted SQL-text assertions read straight off
 * `dataSource.query.mock.calls[0]` for the semantics a mocked `DataSource`
 * cannot otherwise gate — the union-level `ORDER BY`, the degree branch's
 * single Long-term predicate (R-DCE-001 — supersedes the old Training +
 * Long-term conjunction), an `INNER JOIN` per lookup (not `LEFT JOIN`,
 * which would readmit NULL-metadata-id rows), and each branch's own
 * `'<section>' AS section` literal, pinned to its own join column so a
 * cross-wired discriminator reddens even though both literals remain
 * present somewhere in the SQL text. These are clause-by-clause `toContain`
 * checks in the same style as
 * `utils/primary-contract-results.util.spec.ts:24-33`, not a query
 * snapshot. What they do NOT re-prove is that the SQL is *correct* against
 * the real schema — join columns, label columns, and the degree
 * predicate's row-level effect were proven by real-schema execution in
 * T-03/T-04 (`execution.md` § T-03+T-04). This spec gates what a
 * mocked-DataSource unit test *can* actually see: the generated SQL text
 * itself, per-section grouping/bucketing, `Number()` coercion of MySQL's
 * BIGINT-as-string, the generated params array (order and values), and the
 * "always an array, empty rather than absent" contract (R-IMC-007 AC.2).
 *
 * **DC-12's binding fixture requirement is carried literally**: every branch
 * below carries distinct, non-empty data — 6 in Q1, 7 in Q2 — and the rows
 * are interleaved (not grouped contiguously by section) in the mocked
 * resolved value. Under a mocked `DataSource`, the bucketing loop reads
 * `row.section` off this fixture, not off the SQL — so interleaving cannot
 * detect a cross-wired discriminator *in the production SQL* (the SQL-text
 * assertions above own that instead). What the interleaving actually gates:
 * the loop makes no contiguous-run assumption — rows for one section can
 * arrive anywhere in the result set and must still land in their own
 * bucket — and a mutated key in the `sections` initializer drops a section
 * instead of silently swallowing its rows. A legitimately empty branch
 * cannot distinguish "no data" from "mis-bound parameter" — both read as
 * zero rows — which is exactly why no branch here is empty.
 */
describe('IndicatorMetadataReportsRepository', () => {
  let repository: IndicatorMetadataReportsRepository;
  let dataSource: { query: jest.Mock };
  const contractId = 'A9001';

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IndicatorMetadataReportsRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get<IndicatorMetadataReportsRepository>(
      IndicatorMetadataReportsRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getSimpleIndicatorSections — Q1 (6 branches → 6 sections)', () => {
    // Interleaved deliberately, not grouped contiguously by section, and
    // every row carries distinct id/name/count content per section. Names
    // are chosen so that alphabetical order never coincides with the
    // `count DESC, id ASC` order asserted below — a repository that
    // accidentally re-sorted by name (instead of preserving the union's own
    // order) would be caught by the ordering assertions, not just by a
    // contents check.
    const rows = [
      {
        section: 'innovation_nature',
        id: '1',
        name: 'Technological',
        count: '5',
      },
      {
        section: 'oicr_maturity',
        id: '3',
        name: 'Level 3: Enabling environment change',
        count: '3',
      },
      {
        section: 'policy_type',
        id: '2',
        name: 'Policy or investment repealed',
        count: '2',
      },
      { section: 'innovation_type', id: '10', name: 'Product', count: '4' },
      {
        section: 'policy_stage',
        id: '2',
        name: 'Policy proposed.',
        count: '5',
      },
      {
        section: 'innovation_readiness',
        id: '18',
        name: '7. Prototype',
        count: '6',
      },
      {
        section: 'innovation_nature',
        id: '2',
        name: 'Capacity development',
        count: '3',
      },
      {
        section: 'oicr_maturity',
        id: '1',
        name: 'Level 1: Discourse/behavior change',
        count: '1',
      },
      {
        section: 'policy_type',
        id: '1',
        name: 'Policy or investment formulated',
        count: '1',
      },
      { section: 'innovation_type', id: '20', name: 'Process', count: '1' },
      {
        section: 'policy_stage',
        id: '1',
        name: 'Policy enacted.',
        count: '2',
      },
      {
        section: 'innovation_readiness',
        id: '12',
        name: '2. Idea',
        count: '2',
      },
    ];

    beforeEach(() => {
      dataSource.query.mockResolvedValue(rows);
    });

    it('binds exactly one parameter — the contract id (DC-12: the CTE binds it once per query, not once per branch)', async () => {
      await repository.getSimpleIndicatorSections(contractId);

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      const [, params] = dataSource.query.mock.calls[0];
      expect(params).toEqual([contractId]);
    });

    it('embeds the shared primary-contract scoping predicate verbatim — no locally invented scoping join (requirements.md §4.2, R-IMC-001 AC.4)', async () => {
      await repository.getSimpleIndicatorSections(contractId);

      const [sql] = dataSource.query.mock.calls[0];
      // Non-primary exclusion itself is a SQL-level guarantee, proven
      // against the real schema in T-03/T-04 (execution.md). What this
      // assertion gates is that the repository delegates to the one
      // canonical predicate rather than inventing its own scoping join —
      // exactly what §4.2's MUST forbids — by checking the generated SQL
      // contains the util's own exact output.
      expect(sql).toContain(buildPrimaryContractResultsScopeSql());
    });

    it('emits the union-level ORDER BY, an INNER JOIN per lookup, and each branch\'s own section literal pinned to its own join column (Reviewer remediation attempt 2: DC-1 SQL-semantics gate, R-IMC-001 AC.2 "excluded" half)', async () => {
      await repository.getSimpleIndicatorSections(contractId);

      const [sql] = dataSource.query.mock.calls[0];
      const squashed = sql.replace(/\s+/g, ' ').trim();

      // Ordering is applied once, to the union as a whole (design §6.1) —
      // deleting or altering it is invisible to every other assertion in
      // this file, which only inspects the (already-fixture-driven) grouped
      // output, not the SQL.
      expect(squashed).toContain('ORDER BY section, count DESC, id ASC');

      // Split on the union's own branch separator so each pair of
      // assertions below is pinned to ITS OWN branch by fixed structural
      // position — not merely "this literal appears somewhere in the SQL".
      // A bare `toContain("'innovation_nature' AS section")` over the whole
      // query would stay green even if that literal and
      // `'innovation_type' AS section` were swapped between branches, since
      // both strings would still be present, just relocated. Pinning each
      // literal to the branch's own join column is what actually reddens a
      // cross-wired discriminator in the production SQL.
      const branches = squashed.split(' UNION ALL ');
      expect(branches).toHaveLength(6);

      expect(branches[0]).toContain("'innovation_nature' AS section");
      expect(branches[0]).toContain(
        'INNER JOIN clarisa_innovation_characteristics l ON l.id = f.innovation_nature_id',
      );

      expect(branches[1]).toContain("'innovation_type' AS section");
      expect(branches[1]).toContain(
        'INNER JOIN clarisa_innovation_types l ON l.code = f.innovation_type_id',
      );

      expect(branches[2]).toContain("'innovation_readiness' AS section");
      expect(branches[2]).toContain(
        'INNER JOIN clarisa_innovation_readiness_levels l ON l.id = f.innovation_readiness_id',
      );

      expect(branches[3]).toContain("'oicr_maturity' AS section");
      expect(branches[3]).toContain(
        'INNER JOIN maturity_levels l ON l.id = f.maturity_level_id',
      );

      expect(branches[4]).toContain("'policy_type' AS section");
      expect(branches[4]).toContain(
        'INNER JOIN policy_types l ON l.policy_type_id = f.policy_type_id',
      );

      expect(branches[5]).toContain("'policy_stage' AS section");
      expect(branches[5]).toContain(
        'INNER JOIN policy_stage l ON l.policy_stage_id = f.policy_stage_id',
      );
    });

    it('buckets each of the 6 branches into its own section, ordered count DESC / id ASC (DC-1, DC-12)', async () => {
      const result = await repository.getSimpleIndicatorSections(contractId);

      // Ordered `toEqual`, not arrayContaining/toContain — R-IMC-001's
      // ordering AC is a hard criterion. Combined with the interleaved
      // fixture above, distinct non-empty content per section proves the
      // bucketing loop makes no contiguous-run assumption: rows for one
      // section can arrive anywhere in the mocked result set and still
      // land in their own bucket, in the order the fixture carries them.
      // (A cross-wired discriminator *in the production SQL* is not what
      // this proves — see the SQL-text assertion below.)
      expect(result.innovation_nature).toEqual([
        { id: 1, name: 'Technological', count: 5 },
        { id: 2, name: 'Capacity development', count: 3 },
      ]);
      expect(result.innovation_type).toEqual([
        { id: 10, name: 'Product', count: 4 },
        { id: 20, name: 'Process', count: 1 },
      ]);
      expect(result.innovation_readiness).toEqual([
        { id: 18, name: '7. Prototype', count: 6 },
        { id: 12, name: '2. Idea', count: 2 },
      ]);
      expect(result.oicr_maturity).toEqual([
        { id: 3, name: 'Level 3: Enabling environment change', count: 3 },
        { id: 1, name: 'Level 1: Discourse/behavior change', count: 1 },
      ]);
      expect(result.policy_type).toEqual([
        { id: 2, name: 'Policy or investment repealed', count: 2 },
        { id: 1, name: 'Policy or investment formulated', count: 1 },
      ]);
      expect(result.policy_stage).toEqual([
        { id: 2, name: 'Policy proposed.', count: 5 },
        { id: 1, name: 'Policy enacted.', count: 2 },
      ]);
    });

    it('coerces MySQL BIGINT-as-string id/count to Number for every section, and never carries a null/undefined id or name (R-IMC-001 AC.2, R-IMC-002 AC.2, R-IMC-003 AC.2 — NULL-metadata-id rows are excluded upstream by the inner join, real-schema-proven in T-03/T-04; this asserts the repository does not itself introduce a null-named entry)', async () => {
      const result = await repository.getSimpleIndicatorSections(contractId);

      for (const entries of Object.values(result)) {
        expect(entries.length).toBeGreaterThan(0);
        for (const entry of entries) {
          expect(typeof entry.id).toBe('number');
          expect(typeof entry.count).toBe('number');
          expect(entry.name).toEqual(expect.any(String));
        }
      }
    });

    it('returns all 6 sections as empty arrays — not null, not absent — for a contract with no matching rows (R-IMC-007 AC.2 at runtime; R-IMC-002 AC.3)', async () => {
      dataSource.query.mockResolvedValue([]);

      const result = await repository.getSimpleIndicatorSections(contractId);

      expect(result).toEqual({
        innovation_nature: [],
        innovation_type: [],
        innovation_readiness: [],
        oicr_maturity: [],
        policy_type: [],
        policy_stage: [],
      });
    });
  });

  describe('getCapacitySharingMetadata — Q2 (7 branches → 5 raw sections)', () => {
    // Same interleaving/distinctness discipline as Q1. `degree` carries a
    // single row modelling the R-IMC-006 "stale degree" scenario — see the
    // dedicated comment on the bucketing test below for what this fixture
    // does and does not prove.
    const rows = [
      { section: 'session_format', id: '1', name: 'Individual', count: '9' },
      { section: 'gender_individual', id: '1', name: 'Male', count: '5' },
      { section: 'degree', id: '3', name: 'MSc', count: '1' },
      { section: 'gender_group', id: '2', name: 'Female', count: '20' },
      { section: 'session_type', id: '1', name: 'Training', count: '7' },
      { section: 'gender_group', id: '1', name: 'Male', count: '10' },
      { section: 'session_format', id: '2', name: 'Group', count: '4' },
      { section: 'gender_individual', id: '2', name: 'Female', count: '2' },
      { section: 'gender_group', id: '3', name: 'Non-binary', count: '0' },
      { section: 'session_type', id: '2', name: 'Engagement', count: '3' },
    ];

    beforeEach(() => {
      dataSource.query.mockResolvedValue(rows);
    });

    it('binds all 6 parameters in the exact SQL placeholder order — degree keeps only its Long-term operand (R-DCE-001; DC-A gate: a predicate removed without its parameter shifts every later value and reddens here)', async () => {
      await repository.getCapacitySharingMetadata(contractId);

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      const [, params] = dataSource.query.mock.calls[0];
      expect(params).toEqual([
        contractId,
        SessionLengthEnum.LONG_TERM,
        SessionFormatEnum.INDIVIDUAL,
        SessionFormatEnum.GROUP,
        SessionFormatEnum.GROUP,
        SessionFormatEnum.GROUP,
      ]);
    });

    it("binds the degree branch's single Long-term operand to SessionLengthEnum.LONG_TERM at the placeholder position the SQL declares for it (R-DCE-001 supersedes the old Training + Long-term conjunction; DC-A parameter-binding gate)", async () => {
      await repository.getCapacitySharingMetadata(contractId);

      const [, params] = dataSource.query.mock.calls[0];
      // The WHERE clause's `AND` itself executes in SQL, out of reach for a
      // mocked DataSource — the stale-degree guard's row-level effect is
      // real-schema-proven in T-03/T-04 (execution.md § T-03+T-04). What a
      // mocked-DataSource spec *can* gate is that the retained operand is
      // bound at the position the SQL declares for it — dropping the
      // predicate without dropping its param would shift every later value
      // in this array, reddening this assertion (verified in the mutation
      // pass, `execution.md` § T-07).
      expect(params[1]).toBe(SessionLengthEnum.LONG_TERM);
    });

    it('embeds the shared primary-contract scoping predicate verbatim — no locally invented scoping join (requirements.md §4.2, R-IMC-001 AC.4)', async () => {
      await repository.getCapacitySharingMetadata(contractId);

      const [sql] = dataSource.query.mock.calls[0];
      expect(sql).toContain(buildPrimaryContractResultsScopeSql());
    });

    it("gates the degree branch's single Long-term predicate (and the absence of the superseded session-type predicate), the union-level ORDER BY, an INNER JOIN per lookup, and each branch's own section literal pinned to its own join/aggregate column (R-DCE-001; DC-A/DC-B gate)", async () => {
      await repository.getCapacitySharingMetadata(contractId);

      const [sql] = dataSource.query.mock.calls[0];
      const squashed = sql.replace(/\s+/g, ' ').trim();

      // Union-level ORDER BY, applied once to the whole union.
      expect(squashed).toContain('ORDER BY section, count DESC, id ASC');

      // Same branch-position pinning as Q1's sibling test: split on the
      // union's own separator so a cross-wired section literal reddens even
      // though, under a bare whole-SQL toContain, both swapped literals
      // would still be present somewhere in the text.
      const branches = squashed.split(' UNION ALL ');
      expect(branches).toHaveLength(7);

      expect(branches[0]).toContain("'session_format' AS section");
      expect(branches[0]).toContain(
        'INNER JOIN session_formats l ON l.session_format_id = f.session_format_id',
      );

      expect(branches[1]).toContain("'session_type' AS section");
      expect(branches[1]).toContain(
        'INNER JOIN session_types l ON l.session_type_id = f.session_type_id',
      );

      expect(branches[2]).toContain("'degree' AS section");
      expect(branches[2]).toContain(
        'INNER JOIN degrees l ON l.degree_id = f.degree_id',
      );
      // R-DCE-001 (DD-1): the report follows the form — the degree branch
      // keeps only its stale-degree guard (`session_length_id = Long-term`)
      // and drops the superseded `session_type_id = Training` predicate.
      // Asserted as two separate expectations, not one joined string, so
      // either one drifting back onto the branch reddens on its own — this
      // is the DC-A/DC-B gate: a `Training` predicate re-added without its
      // positional param would shift every later value in `params` instead
      // of erroring, which is why the whole-array assertion above exists.
      expect(branches[2]).toContain('AND f.session_length_id = ?');
      expect(branches[2]).not.toContain('AND f.session_type_id = ?');

      expect(branches[3]).toContain("'gender_individual' AS section");
      expect(branches[3]).toContain(
        'INNER JOIN gender l ON l.gender_id = f.gender_id',
      );

      // The three gender_group branches join no lookup (design §6.2 — three
      // fixed columns, not rows), so each is pinned instead to its own
      // COALESCE(SUM(...)) aggregate column, which is equally unique per
      // branch.
      expect(branches[4]).toContain("'gender_group' AS section");
      expect(branches[4]).toContain(
        'COALESCE(SUM(f.session_participants_male), 0) AS count',
      );

      expect(branches[5]).toContain("'gender_group' AS section");
      expect(branches[5]).toContain(
        'COALESCE(SUM(f.session_participants_female), 0) AS count',
      );

      expect(branches[6]).toContain("'gender_group' AS section");
      expect(branches[6]).toContain(
        'COALESCE(SUM(f.session_participants_non_binary), 0) AS count',
      );
    });

    it('buckets each of the 7 branches into its own section, ordered count DESC / id ASC — including the DC-B "stale degree" scenario', async () => {
      const result = await repository.getCapacitySharingMetadata(contractId);

      expect(result.session_format).toEqual([
        { id: 1, name: 'Individual', count: 9 },
        { id: 2, name: 'Group', count: 4 },
      ]);
      expect(result.session_type).toEqual([
        { id: 1, name: 'Training', count: 7 },
        { id: 2, name: 'Engagement', count: 3 },
      ]);
      // `degree`'s single row models the R-DCE-001 stale-degree guard
      // (DD-1 supersedes R-IMC-006 AC.1, but AC.2 survives): a fixture with
      // a Short-term/MSc row is proven, on live data, to be excluded once
      // the retained `session_length_id = Long-term` predicate runs — the
      // superseded `session_type_id = Training` predicate plays no part.
      // This repository only ever sees the SQL's *already filtered* output
      // — the Short-term/MSc row is excluded upstream and never appears in
      // the resolved rows above — so this assertion proves the repository
      // buckets that already-filtered row without corrupting or
      // duplicating it; the predicate's own enforcement is
      // real-schema-gated (execution.md § T-03+T-04).
      expect(result.degree).toEqual([{ id: 3, name: 'MSc', count: 1 }]);
      expect(result.gender_individual).toEqual([
        { id: 1, name: 'Male', count: 5 },
        { id: 2, name: 'Female', count: 2 },
      ]);
      expect(result.gender_group).toEqual([
        { id: 2, name: 'Female', count: 20 },
        { id: 1, name: 'Male', count: 10 },
        { id: 3, name: 'Non-binary', count: 0 },
      ]);
    });

    it("never merges or re-sorts gender_individual / gender_group here — that is T-05's pure util, invoked downstream by T-06", async () => {
      const result = await repository.getCapacitySharingMetadata(contractId);

      expect(result).not.toHaveProperty('gender_distribution');
      expect(result.gender_individual).toHaveLength(2);
      expect(result.gender_group).toHaveLength(3);
    });

    it('returns the 4 non-gender_group sections as empty arrays for a contract with no matching rows, while gender_group still reports its 3 always-present literals at 0 (R-IMC-005 AC.2; R-IMC-007 AC.2 at runtime)', async () => {
      // Matches the live A1001 evidence (execution.md § T-03+T-04): "Q2's
      // gender_group returns 3 rows at 0" even for a contract with zero
      // primary results — the three branches carry no GROUP BY by design,
      // so a bare COALESCE(SUM(...), 0) always yields exactly one row.
      dataSource.query.mockResolvedValue([
        { section: 'gender_group', id: '1', name: 'Male', count: '0' },
        { section: 'gender_group', id: '2', name: 'Female', count: '0' },
        { section: 'gender_group', id: '3', name: 'Non-binary', count: '0' },
      ]);

      const result = await repository.getCapacitySharingMetadata(contractId);

      expect(result).toEqual({
        session_format: [],
        session_type: [],
        degree: [],
        gender_individual: [],
        gender_group: [
          { id: 1, name: 'Male', count: 0 },
          { id: 2, name: 'Female', count: 0 },
          { id: 3, name: 'Non-binary', count: 0 },
        ],
      });
    });

    it('buckets a degree row sourced from an Engagement + Long-term record into sections.degree exactly as before (R-DCE-001 — the STAR-3422/A100 scenario; pins that the repository applies no post-query session-type filter of its own)', async () => {
      // Models requirements.md §1 / R-DCE-001's first scenario: the SQL's
      // own (now single) predicate is what admits or excludes this row —
      // that row-level effect is real-schema-proven, not this mocked spec's
      // job. What this pins is the repository layer itself: it does not
      // re-derive or re-check `session_type` in TypeScript before
      // bucketing, so whatever the query hands back for the `degree`
      // branch — Training-sourced or Engagement-sourced alike — lands in
      // `sections.degree` unchanged. A post-query filter re-introduced here
      // would silently exclude this row again without the SQL ever
      // changing, which the DC-A/DC-B SQL-text assertions above cannot see.
      dataSource.query.mockResolvedValueOnce([
        { section: 'degree', id: '5', name: 'PhD', count: '1' },
      ]);

      const result = await repository.getCapacitySharingMetadata(contractId);

      expect(result.degree).toEqual([{ id: 5, name: 'PhD', count: 1 }]);
    });
  });
});
