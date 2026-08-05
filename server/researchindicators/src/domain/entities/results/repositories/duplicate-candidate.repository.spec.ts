// @sdd-spec results/cross-platform-duplicate-resolution
/**
 * These tests cover the STRUCTURE of the generated `UNION ALL` — which
 * branch reads which table, which predicate lands in which branch, and
 * which columns are projected — by inspecting the SQL string handed to
 * `query()` (mocked, per KZ-001: the mock never evaluates SQL, so it proves
 * nothing about whether the query actually RUNS or returns the right rows
 * against a real database). That behavioral property — real MySQL rows,
 * real collation, real `REGEXP` — is out of a unit test's reach and belongs
 * to T-14 (live-data invariants) and the T-11-style e2e seed, exactly like
 * `public-link-normalizer.util.spec.ts`'s own stated split between
 * structure and behavior.
 */
import { DataSource } from 'typeorm';
import {
  DuplicateCandidateRepository,
  DuplicateGroupKey,
} from './duplicate-candidate.repository';
import { PublicationIdentitySource } from '../../../shared/utils/publication-identity.util';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';

describe('DuplicateCandidateRepository', () => {
  let repository: DuplicateCandidateRepository;
  let querySpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  /** Splits the generated SQL into its two `UNION ALL` branches for isolated assertions. */
  const branches = (sql: string): [string, string] => {
    const parts = sql.split('UNION ALL');
    expect(parts).toHaveLength(2);
    return [parts[0], parts[1]];
  };

  beforeEach(() => {
    repository = new DuplicateCandidateRepository(dataSource);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('the identity UNION — shared across all three reads', () => {
    it.each([
      [
        'findCandidatesForIncoming',
        () =>
          repository.findCandidatesForIncoming({
            publicLink: 'https://hdl.handle.net/10568/141764',
            reportYearId: 2024,
          }),
      ],
      [
        'findCrossPlatformGroupKeys',
        () => repository.findCrossPlatformGroupKeys({}),
      ],
      [
        'findMembersByNormalizedLinks',
        () => repository.findMembersByNormalizedLinks(['hdl.handle.net/x/1']),
      ],
    ])('%s reads through the two-branch UNION ALL', async (_name, call) => {
      await call();
      const sql = querySpy.mock.calls[0][0] as string;
      const [branch1, branch2] = branches(sql);

      // Branch 1 (TIP/AICCRA): public_link, never result_evidences.
      expect(branch1).toContain('r.public_link');
      expect(branch1).toContain("platform_code IN ('TIP', 'AICCRA')");
      expect(branch1).not.toContain('result_evidences');
      expect(branch1).not.toContain('evidence_role_id');

      // Branch 2 (PRMS): result_evidences, never public_link as the identity source.
      expect(branch2).toContain('result_evidences');
      expect(branch2).toContain('evidence_role_id');
      expect(branch2).toContain("platform_code = 'PRMS'");
      expect(branch2).not.toContain('r.public_link');
    });

    it('projects identitySource as the literal PUBLIC_LINK on branch 1 and HANDLE_EVIDENCE on branch 2', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const sql = querySpy.mock.calls[0][0] as string;
      const [branch1, branch2] = branches(sql);

      expect(branch1).toContain(
        `'${PublicationIdentitySource.PUBLIC_LINK}' AS identitySource`,
      );
      expect(branch2).toContain(
        `'${PublicationIdentitySource.HANDLE_EVIDENCE}' AS identitySource`,
      );
    });

    it('applies NO handle-format filter on branch 1 (AC.6 — a filter would drop 269 real AICCRA rows)', async () => {
      // Branch 1 legitimately contains `REGEXP_REPLACE` — that is the shared
      // normalization pipeline every identity goes through, not a scope
      // filter. What must be absent is the boolean `REGEXP '<pattern>'`
      // predicate `isHandleFormatIdentitySql` adds, and the handle pattern
      // text itself.
      await repository.findCrossPlatformGroupKeys({});
      const [branch1] = branches(querySpy.mock.calls[0][0] as string);
      expect(branch1).not.toContain("REGEXP '");
      expect(branch1).not.toContain('hdl');
    });

    it('requires the handle format on branch 2 only', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const [branch1, branch2] = branches(querySpy.mock.calls[0][0] as string);
      expect(branch2).toContain("REGEXP '");
      expect(branch2).toContain('hdl');
      expect(branch2).toContain('e.evidence_url');
      expect(branch1).not.toContain("REGEXP '");
    });

    it('applies the PRMS role/privacy/active predicate on branch 2 only', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const [branch1, branch2] = branches(querySpy.mock.calls[0][0] as string);
      expect(branch2).toContain('e.evidence_role_id = 1');
      expect(branch2).toContain('COALESCE(e.is_private, FALSE) = FALSE');
      expect(branch2).toContain('COALESCE(e.is_active, TRUE) = TRUE');
      expect(branch1).not.toContain('evidence_role_id');
    });

    it('groups branch 2 by (result_id, normalizedPublicLink) — JD3-S-04 dedup guard', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const sql = querySpy.mock.calls[0][0] as string;
      // `branches()` splits only on `UNION ALL`, so `branch2` (everything
      // after it) also contains the CTE's closing `identity_counted` block
      // AND the OUTER query's own `GROUP BY normalizedPublicLink` / `SELECT
      // ... r.result_id AS resultId` — deleting branch 2's own `GROUP BY`
      // clause entirely left every assertion below green against that outer
      // text (Reviewer FAIL: a test that cannot fail). Anchor to the
      // substring between the PRMS join and the next CTE's name
      // (`identity_counted AS (`), which is branch 2's OWN query and nothing
      // else. NOTE: a naive `indexOf('),', branch2Start)` is itself a trap —
      // `normalizedPublicLinkSql`'s internal `REGEXP_REPLACE(TRIM(operand),
      // …)` contains a literal `),` many lines before branch 2's real
      // closing paren, which would truncate the slice mid-predicate and
      // before the GROUP BY ever appears (verified against the generated SQL
      // while writing this fix).
      const branch2Start = sql.indexOf('INNER JOIN result_evidences');
      expect(branch2Start).toBeGreaterThan(-1);
      const branch2End = sql.indexOf('identity_counted AS (', branch2Start);
      expect(branch2End).toBeGreaterThan(branch2Start);
      const branch2Own = sql.slice(branch2Start, branch2End);

      expect(branch2Own).toContain('GROUP BY');
      expect(branch2Own).toContain('r.result_id');
      expect(branch2Own).toContain('normalizedPublicLink');

      // Branch 1 needs no such grouping — a `results` row has exactly one
      // `public_link`, so it can never contribute more than one row per id.
      const [branch1] = branches(sql);
      expect(branch1).not.toContain('GROUP BY');
    });

    it.each([
      [
        'findCandidatesForIncoming',
        () =>
          repository.findCandidatesForIncoming({
            publicLink: 'https://hdl.handle.net/10568/141764',
            reportYearId: 2024,
          }),
      ],
      [
        'findCrossPlatformGroupKeys',
        () => repository.findCrossPlatformGroupKeys({}),
      ],
      [
        'findMembersByNormalizedLinks',
        () => repository.findMembersByNormalizedLinks(['hdl.handle.net/x/1']),
      ],
    ])(
      '%s runs its comparison under utf8mb4_bin on both union branches — not by folding case/accents (R-RES-001 AC.2)',
      async (_name, call) => {
        // `public_link` is `utf8mb3_general_ci`, which folds case and accents;
        // a plain `=`/`GROUP BY` on it would over-match, and over-matching
        // here means a hard delete of a distinct publication. This asserts
        // the collation is actually PRESENT in each branch's own generated
        // text, not merely present somewhere in the SQL string (which a
        // single normalization call anywhere would satisfy trivially) — each
        // branch calls `normalizedPublicLinkSql` on its own operand, so a
        // regression that dropped the CAST/COLLATE from one branch only
        // would still leave the OTHER branch's occurrence in the string.
        await call();
        const sql = querySpy.mock.calls[0][0] as string;
        const [branch1, branch2] = branches(sql);
        expect(branch1).toContain('utf8mb4_bin');
        expect(branch2).toContain('utf8mb4_bin');
      },
    );

    it('carries the row-scope predicate (is_active/is_snapshot) into BOTH branches', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const [branch1, branch2] = branches(querySpy.mock.calls[0][0] as string);
      for (const branch of [branch1, branch2]) {
        expect(branch).toContain('COALESCE(r.is_active, TRUE) = TRUE');
        expect(branch).toContain('COALESCE(r.is_snapshot, FALSE) = FALSE');
      }
    });

    it('computes identityCount as a correlated subquery over the WHOLE union, not a window function', async () => {
      // Deliberate choice over `COUNT(DISTINCT …) OVER (…)`: no assumption
      // about window-function DISTINCT support across MySQL 8.0.x releases.
      await repository.findCrossPlatformGroupKeys({});
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('AS identityCount');
      expect(sql).toContain('COUNT(DISTINCT ic2.normalizedPublicLink)');
      expect(sql).not.toContain('OVER (');
    });
  });

  describe('findCandidatesForIncoming', () => {
    it('binds reportYearId then the normalized incoming value', async () => {
      await repository.findCandidatesForIncoming({
        publicLink: 'https://hdl.handle.net/10568/141764/',
        reportYearId: 2024,
      });

      const [sql, params] = querySpy.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('reportYearId = ?');
      expect(sql).toContain('normalizedPublicLink =');
      expect(params[0]).toBe(2024);
      expect(params.slice(1).every((v) => v === params[1])).toBe(true);
      expect(params.length).toBeGreaterThan(1);
    });

    it('maps a raw row into a DuplicateCandidate with the renamed rawIdentity field', async () => {
      querySpy.mockResolvedValue([
        {
          resultId: '10',
          resultOfficialCode: '100',
          platformCode: ReportingPlatformEnum.PRMS,
          indicatorId: String(IndicatorsEnum.KNOWLEDGE_PRODUCT),
          reportYearId: '2024',
          rawIdentity: 'https://hdl.handle.net/10568/141764',
          identitySource: PublicationIdentitySource.HANDLE_EVIDENCE,
          normalizedPublicLink: 'hdl.handle.net/10568/141764',
          identityCount: '1',
        },
      ]);

      const [candidate] = await repository.findCandidatesForIncoming({
        publicLink: 'https://hdl.handle.net/10568/141764',
        reportYearId: 2024,
      });

      expect(candidate).toEqual({
        resultId: 10,
        resultOfficialCode: 100,
        platformCode: ReportingPlatformEnum.PRMS,
        indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
        reportYearId: 2024,
        rawIdentity: 'https://hdl.handle.net/10568/141764',
        identitySource: PublicationIdentitySource.HANDLE_EVIDENCE,
        normalizedPublicLink: 'hdl.handle.net/10568/141764',
        identityCount: 1,
      });
      // No field literally named `rawPublicLink` remains — that name would be
      // a lie on this (PRMS) row, whose raw value is an evidence URL.
      expect(candidate).not.toHaveProperty('rawPublicLink');
    });

    it('fails CLOSED — throws rather than silently treating a non-finite identityCount as unambiguous', async () => {
      // `refuseMultiIdentityLosers` computes `(loser.identityCount ?? 1) > 1`.
      // `Number('not-a-number')` is `NaN`, and `NaN > 1` is `false` — so a
      // projection/alias regression that produced `NaN` here would make the
      // multi-identity refusal silently NEVER fire while `identityCount`
      // still reads as present (not distinguishable from a genuine `1`) in
      // whatever consumes this candidate. On the one branch standing between
      // an ambiguous identity and an irreversible hard delete, this must
      // fail loudly instead.
      querySpy.mockResolvedValue([
        {
          resultId: '40',
          resultOfficialCode: '400',
          platformCode: ReportingPlatformEnum.PRMS,
          indicatorId: String(IndicatorsEnum.KNOWLEDGE_PRODUCT),
          reportYearId: '2024',
          rawIdentity: 'https://hdl.handle.net/10568/999999',
          identitySource: PublicationIdentitySource.HANDLE_EVIDENCE,
          normalizedPublicLink: 'hdl.handle.net/10568/999999',
          identityCount: 'not-a-number',
        },
      ]);

      await expect(
        repository.findCandidatesForIncoming({
          publicLink: 'https://hdl.handle.net/10568/999999',
          reportYearId: 2024,
        }),
      ).rejects.toThrow(/identityCount/);
    });
  });

  describe('findCrossPlatformGroupKeys', () => {
    it('requires more than one platform via HAVING', async () => {
      await repository.findCrossPlatformGroupKeys({});
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('HAVING COUNT(DISTINCT platformCode) > 1');
    });

    it('applies reportYearId/platform/indicator filters as outer WHERE clauses', async () => {
      await repository.findCrossPlatformGroupKeys({
        reportYearId: 2024,
        platformCodes: [ReportingPlatformEnum.TIP, ReportingPlatformEnum.PRMS],
        indicatorIds: [IndicatorsEnum.KNOWLEDGE_PRODUCT],
      });

      const [sql, params] = querySpy.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('reportYearId = ?');
      expect(sql).toContain('platformCode IN (?, ?)');
      expect(sql).toContain('indicatorId IN (?)');
      expect(params).toEqual([
        2024,
        ReportingPlatformEnum.TIP,
        ReportingPlatformEnum.PRMS,
        IndicatorsEnum.KNOWLEDGE_PRODUCT,
      ]);
    });

    it('applies limit and offset only when both are given', async () => {
      await repository.findCrossPlatformGroupKeys({ limit: 50, offset: 100 });
      const [sql, params] = querySpy.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('LIMIT ?');
      expect(sql).toContain('OFFSET ?');
      expect(params).toEqual([50, 100]);
    });

    it('maps rows to DuplicateGroupKey', async () => {
      querySpy.mockResolvedValue([
        {
          normalizedPublicLink: 'hdl.handle.net/1/1',
          members: '2',
          platforms: '2',
          reportYears: '1',
        },
      ]);
      const [group]: DuplicateGroupKey[] =
        await repository.findCrossPlatformGroupKeys({});
      expect(group).toEqual({
        normalizedPublicLink: 'hdl.handle.net/1/1',
        members: 2,
        platforms: 2,
        reportYears: 1,
      });
    });
  });

  describe('findMembersByNormalizedLinks', () => {
    it('returns [] without querying when given no links', async () => {
      const result = await repository.findMembersByNormalizedLinks([]);
      expect(result).toEqual([]);
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('binds one placeholder per link, unmodified (already-normalized values)', async () => {
      await repository.findMembersByNormalizedLinks([
        'hdl.handle.net/1/1',
        'hdl.handle.net/2/2',
      ]);
      const [sql, params] = querySpy.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('normalizedPublicLink IN (?, ?)');
      expect(params).toEqual(['hdl.handle.net/1/1', 'hdl.handle.net/2/2']);
    });

    it('orders by normalizedPublicLink then resultId', async () => {
      await repository.findMembersByNormalizedLinks(['hdl.handle.net/1/1']);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY normalizedPublicLink, resultId');
    });
  });
});
