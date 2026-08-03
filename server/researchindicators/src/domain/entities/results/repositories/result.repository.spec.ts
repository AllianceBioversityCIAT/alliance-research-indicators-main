import { DataSource } from 'typeorm';
import { ResultRepository, ResultFiltersInterface } from './result.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';
import { ResultSortEnum } from '../enum/result-sort.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { effectivePoolFundingContributorSql } from '../../../shared/utils/pool-funding.util';

describe('ResultRepository', () => {
  let repository: ResultRepository;
  let querySpy: jest.SpyInstance;

  const appConfig = {
    ARI_MYSQL_NAME: 'test_schema',
  } as AppConfig;

  const createDataSource = () =>
    ({
      createEntityManager: jest.fn().mockReturnValue({}),
      getRepository: jest.fn(),
    }) as unknown as DataSource;

  let dataSource: DataSource;

  beforeEach(() => {
    dataSource = createDataSource();
    repository = new ResultRepository(appConfig, dataSource);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findDataForOpenSearch', () => {
    it('builds query without id filter and with is_active when not SHOW_ALL', async () => {
      await repository.findDataForOpenSearch(FindAllOptions.SHOW_ONLY_ACTIVE);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('from results r');
      expect(sql).toContain('and r.is_active = 1');
      expect(sql).not.toMatch(/and r\.result_id in \(\d/);
    });

    it('omits is_active filter for SHOW_ALL', async () => {
      await repository.findDataForOpenSearch(FindAllOptions.SHOW_ALL);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).not.toContain('and r.is_active = 1');
    });

    it('adds result_id IN clause when ids provided', async () => {
      await repository.findDataForOpenSearch(
        FindAllOptions.SHOW_ALL,
        [1, 2, 3],
      );
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('and r.result_id in (1,2,3)');
    });
  });

  describe('generalReport', () => {
    it('executes the reporting SQL', async () => {
      await repository.generalReport();
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('FROM results r');
      expect(sql).toContain("r.result_official_code as 'Code'");
    });
  });

  describe('filterByPrimaryContract', () => {
    it('returns empty string when codes empty', () => {
      expect(repository['filterByPrimaryContract']([])).toBe('');
    });

    it('returns INNER JOIN fragment with quoted codes', () => {
      const q = repository['filterByPrimaryContract'](['A-1', 'B-2']);
      expect(q).toContain('INNER JOIN');
      expect(q).toContain("'A-1'");
      expect(q).toContain("'B-2'");
    });
  });

  describe('findResultsFilters', () => {
    it('applies pagination limit and offset', async () => {
      await repository.findResultsFilters({
        page: 2,
        limit: 5,
      } as Partial<ResultFiltersInterface>);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('LIMIT 5 OFFSET 5');
    });

    it('defaults sort to ASC and accepts DESC', async () => {
      await repository.findResultsFilters(
        {} as Partial<ResultFiltersInterface>,
      );
      expect(querySpy.mock.calls[0][0] as string).toContain(
        'ORDER BY r.result_official_code ASC',
      );
      querySpy.mockClear();
      await repository.findResultsFilters({
        sort_order: 'desc',
      } as Partial<ResultFiltersInterface>);
      expect(querySpy.mock.calls[0][0] as string).toContain(
        'ORDER BY r.result_official_code DESC',
      );
    });

    it('ignores invalid sort_order', async () => {
      await repository.findResultsFilters({
        sort_order: 'INVALID',
      } as Partial<ResultFiltersInterface>);
      expect(querySpy.mock.calls[0][0] as string).toContain(
        'ORDER BY r.result_official_code ASC',
      );
    });

    it('adds filters for codes and platform', async () => {
      await repository.findResultsFilters({
        resultCodes: ['10', '20'],
        contract_codes: ['C1'],
        lever_codes: ['L1'],
        indicator_code: ['3'],
        status_codes: ['4'],
        user_codes: ['5'],
        years: ['2024'],
        platform_code: ['STAR'],
      } as Partial<ResultFiltersInterface>);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('AND r.result_official_code IN');
      expect(sql).toContain('AND ac.agreement_id IN');
      expect(sql).toContain('AND cl.id IN');
      expect(sql).toContain('AND r.indicator_id IN');
      expect(sql).toContain('AND r.result_status_id IN');
      expect(sql).toContain('AND r.created_by IN');
      expect(sql).toContain('AND r.report_year_id IN');
      expect(sql).toContain('AND r.platform_code IN');
    });

    it('adds optional joins and selects from query constructors', async () => {
      await repository.findResultsFilters({
        contracts: true,
        primary_contract: true,
        levers: true,
        primary_lever: true,
        indicators: true,
        result_status: true,
        result_audit_data: true,
        result_audit_data_objects: true,
      } as Partial<ResultFiltersInterface>);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('result_contracts');
      expect(sql).toContain('result_levers');
      expect(sql).toContain('as indicators');
      expect(sql).toContain('as result_status');
      expect(sql).toContain('test_schema.sec_users su1');
      expect(sql).toContain('r.created_at');
    });

    it('includes filterByPrimaryContract join when filter_primary_contract set', async () => {
      await repository.findResultsFilters({
        filter_primary_contract: ['P1'],
      } as Partial<ResultFiltersInterface>);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain("'P1'");
      expect(sql).toContain('fpc.result_id = r.result_id');
    });

    it('uses JSON_ARRAYAGG for contracts when primary_contract is false', async () => {
      await repository.findResultsFilters({
        contracts: true,
        primary_contract: false,
      } as Partial<ResultFiltersInterface>);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('JSON_ARRAYAGG(COALESCE(');
    });
  });

  describe('deleteResult', () => {
    it('calls delete_result stored function', async () => {
      await repository.deleteResult(77);
      expect(querySpy).toHaveBeenCalledWith('SELECT delete_result(?);', [77]);
    });
  });

  describe('metadataPrincipalInvestigator', () => {
    it('returns default row when query is empty', async () => {
      querySpy.mockResolvedValueOnce([]);
      const out = await repository.metadataPrincipalInvestigator(9, 3);
      expect(out).toEqual({ result_id: 9, is_principal: 0 });
    });

    it('returns first row when present', async () => {
      querySpy.mockResolvedValueOnce([{ result_id: 9, is_principal: 1 }]);
      const out = await repository.metadataPrincipalInvestigator(9, 3);
      expect(out).toEqual({ result_id: 9, is_principal: 1 });
    });
  });

  describe('isMainContactPerson', () => {
    it('returns false when query is empty', async () => {
      querySpy.mockResolvedValueOnce([]);
      await expect(repository.isMainContactPerson(9, 3)).resolves.toBe(false);
      expect(querySpy.mock.calls[0][1]).toEqual([3, 9]);
    });

    it('returns false when is_main_contact is not 1', async () => {
      querySpy.mockResolvedValueOnce([{ is_main_contact: 0 }]);
      await expect(repository.isMainContactPerson(9, 3)).resolves.toBe(false);
    });

    it('returns true when is_main_contact is 1', async () => {
      querySpy.mockResolvedValueOnce([{ is_main_contact: 1 }]);
      await expect(repository.isMainContactPerson(9, 3)).resolves.toBe(true);
    });

    it('runs SQL joining result_users to sec_users by email', async () => {
      querySpy.mockResolvedValueOnce([{ is_main_contact: 0 }]);
      await repository.isMainContactPerson(12, 5);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain('FROM result_users ru');
      expect(sql).toContain('ru.user_role_id = 1');
      expect(sql).toContain('ru.result_id = ?');
    });
  });

  describe('findUserByCarnetId', () => {
    it('returns null for empty carnet', async () => {
      await expect(repository.findUserByCarnetId('')).resolves.toBeNull();
      await expect(
        repository.findUserByCarnetId(null as any),
      ).resolves.toBeNull();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('returns first user row', async () => {
      const row = { sec_user_id: 1, carnet: 'X' } as SecUser;
      querySpy.mockResolvedValueOnce([row]);
      await expect(repository.findUserByCarnetId('X')).resolves.toBe(row);
    });
  });

  describe('findUserByEmail', () => {
    it('returns null for empty email', async () => {
      await expect(repository.findUserByEmail('')).resolves.toBeNull();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('returns first match', async () => {
      const row = { sec_user_id: 2, email: 'a@b.c' } as SecUser;
      querySpy.mockResolvedValueOnce([row]);
      await expect(repository.findUserByEmail('a@b.c')).resolves.toBe(row);
    });
  });

  describe('findUserByEmailOrCarnet', () => {
    it('returns null when both missing', async () => {
      await expect(
        repository.findUserByEmailOrCarnet(undefined, undefined),
      ).resolves.toBeNull();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('prefers carnet match over email', async () => {
      const byCarnet = { sec_user_id: 1, carnet: 'C' } as SecUser;
      querySpy.mockResolvedValueOnce([byCarnet]);
      const out = await repository.findUserByEmailOrCarnet('C', 'e@mail.com');
      expect(out).toBe(byCarnet);
    });

    it('falls back to email when carnet not found', async () => {
      querySpy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { sec_user_id: 2, email: 'e@mail.com' } as SecUser,
        ]);
      const out = await repository.findUserByEmailOrCarnet(
        'missing',
        'e@mail.com',
      );
      expect(out?.sec_user_id).toBe(2);
    });

    it('returns null when neither carnet nor email resolves', async () => {
      querySpy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      await expect(
        repository.findUserByEmailOrCarnet('nope', 'gone@x.org'),
      ).resolves.toBeNull();
    });
  });

  describe('createUserInSecUsers', () => {
    it('inserts with null carnet when no alliance staff match', async () => {
      const findOne = jest.fn().mockResolvedValue(null);
      (dataSource.getRepository as jest.Mock).mockReturnValue({ findOne });

      const created = {
        sec_user_id: 10,
        email: 'new@x.org',
        carnet: 'CAR1',
      } as SecUser;
      querySpy
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([created]);

      const out = await repository.createUserInSecUsers({
        first_name: 'N',
        last_name: 'M',
        email: 'new@x.org',
        carnet: 'CAR1',
      } as SecUser);

      expect(findOne).toHaveBeenCalledWith({
        where: { carnet: 'CAR1', is_active: true },
      });
      expect(querySpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO test_schema.sec_users'),
        ['N', 'M', 'new@x.org', null, 1],
      );
      expect(out).toBe(created);
      expect(dataSource.getRepository).toHaveBeenCalledWith(AllianceUserStaff);
    });

    it('passes carnet when alliance staff exists', async () => {
      const findOne = jest.fn().mockResolvedValue({ id: 1 });
      (dataSource.getRepository as jest.Mock).mockReturnValue({ findOne });

      const created = {
        sec_user_id: 11,
        email: 'x@y.z',
        carnet: 'Z9',
      } as SecUser;
      querySpy
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([created]);

      await repository.createUserInSecUsers({
        first_name: 'A',
        last_name: 'B',
        email: 'x@y.z',
        carnet: 'Z9',
      } as SecUser);

      expect(querySpy).toHaveBeenNthCalledWith(1, expect.any(String), [
        'A',
        'B',
        'x@y.z',
        'Z9',
        1,
      ]);
    });
  });

  describe('unpdateCarnetUser', () => {
    it('runs update query', async () => {
      await repository.unpdateCarnetUser(4, 'NEW');
      expect(querySpy).toHaveBeenCalledWith(
        'UPDATE sec_users SET carnet = ? WHERE sec_user_id = ?',
        ['NEW', 4],
      );
    });
  });

  const emptyFindResultsV2Filters = () => ({
    status: [] as ResultStatusEnum[],
    contracts: [] as string[],
    years: [] as string[],
    sources: [] as ReportingPlatformEnum[],
    indicators: [] as IndicatorsEnum[],
    currentUser: { onlyOwnResults: false, userId: 42 },
  });

  describe('findResultsV2 public link SQL helpers', () => {
    it('buildFindResultsV2BuiltPublicLinkSqlExpression returns NULL until built URLs are defined', () => {
      expect(
        repository['buildFindResultsV2BuiltPublicLinkSqlExpression'](),
      ).toBe('NULL');
    });

    it('buildFindResultsV2PublicLinkSqlExpression uses PRMS/TIP column and built branch', () => {
      const expr = repository['buildFindResultsV2PublicLinkSqlExpression']();
      expect(expr).toContain("r.platform_code NOT IN ('STAR')");
      expect(expr).toContain('r.public_link');
      expect(expr).toContain('NULL');
    });

    it('buildFindResultsV2SearchStaticWhereFragment matches on effective public_link and cgspace_link', () => {
      const where = repository['buildFindResultsV2SearchStaticWhereFragment']();
      expect(where).toContain('ro.cgspace_link LIKE CONCAT');
      expect(where).toMatch(
        /\(IF\([\s\S]*r\.public_link[\s\S]*NULL[\s\S]*\)\) LIKE CONCAT/,
      );
    });

    it('buildFindResultsV2SearchRelevanceSelectFragment scores effective public_link and cgspace_link', () => {
      const relevance = repository[
        'buildFindResultsV2SearchRelevanceSelectFragment'
      ](['anna']);
      expect(relevance).toContain('ro.cgspace_link LIKE CONCAT');
      expect(relevance).toMatch(
        /CASE WHEN \(IF\([\s\S]*r\.public_link[\s\S]*\) LIKE CONCAT\('%', \?, '%'\) THEN 500/,
      );
      expect(relevance).toContain('_search_relevance');
    });

    it('splitFindResultsV2CreatorNameTokens splits on whitespace', () => {
      expect(
        repository['splitFindResultsV2CreatorNameTokens']('  david   casanas '),
      ).toEqual(['david', 'casanas']);
    });

    it('splitFindResultsV2CreatorNameTokens falls back to full search when empty after trim', () => {
      expect(repository['splitFindResultsV2CreatorNameTokens']('   ')).toEqual([
        '   ',
      ]);
    });
  });

  describe('findResultsV2', () => {
    it('joins result_oicrs and selects cgspace_link', async () => {
      querySpy.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
      await repository.findResultsV2(
        '',
        undefined,
        undefined,
        emptyFindResultsV2Filters(),
      );
      const mainSql = querySpy.mock.calls[1][0] as string;
      expect(mainSql).toContain(
        'LEFT JOIN result_oicrs ro ON ro.result_id = r.result_id',
      );
      expect(mainSql).toContain('ro.cgspace_link');
      expect(mainSql).toMatch(/IF\([\s\S]*AS public_link/);
    });

    it('omits search fragments when search is empty', async () => {
      querySpy.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
      await repository.findResultsV2(
        '',
        undefined,
        undefined,
        emptyFindResultsV2Filters(),
      );
      const countSql = querySpy.mock.calls[0][0] as string;
      const mainSql = querySpy.mock.calls[1][0] as string;
      expect(countSql).not.toContain('ro.cgspace_link LIKE');
      expect(mainSql).not.toContain('_search_relevance');
      expect(querySpy.mock.calls[0][1]).toEqual([]);
      expect(querySpy.mock.calls[1][1]).toEqual([100, 0]);
    });

    it('includes public_link and cgspace_link search with aligned placeholder counts', async () => {
      const search = '10568/12345';
      const staticWhereCount =
        ResultRepository[
          'FIND_RESULTS_V2_SEARCH_STATIC_WHERE_PLACEHOLDER_COUNT'
        ];
      const staticRelevanceCount =
        ResultRepository[
          'FIND_RESULTS_V2_SEARCH_STATIC_RELEVANCE_PLACEHOLDER_COUNT'
        ];
      querySpy
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([{ result_id: 1, _search_relevance: 500 }]);
      await repository.findResultsV2(
        search,
        { page: 1, limit: 10 },
        undefined,
        emptyFindResultsV2Filters(),
      );
      const countParams = querySpy.mock.calls[0][1] as unknown[];
      const mainParams = querySpy.mock.calls[1][1] as unknown[];
      const countSql = querySpy.mock.calls[0][0] as string;
      const mainSql = querySpy.mock.calls[1][0] as string;

      expect(countSql).toContain('ro.cgspace_link LIKE CONCAT');
      expect(mainSql).toContain('ORDER BY _search_relevance DESC');
      expect(countParams).toHaveLength(staticWhereCount + 2);
      expect(countParams.every((p) => p === search)).toBe(true);
      expect(mainParams).toHaveLength(
        staticRelevanceCount + staticWhereCount + 4 + 2,
      );
      expect(
        mainParams.slice(0, staticRelevanceCount).every((p) => p === search),
      ).toBe(true);
      expect(
        mainParams
          .slice(staticRelevanceCount, staticRelevanceCount + staticWhereCount)
          .every((p) => p === search),
      ).toBe(true);
      expect(mainParams.slice(-2)).toEqual([10, 0]);
    });

    it('binds creator-name tokens separately for multi-word search', async () => {
      const staticWhereCount =
        ResultRepository[
          'FIND_RESULTS_V2_SEARCH_STATIC_WHERE_PLACEHOLDER_COUNT'
        ];
      const staticRelevanceCount =
        ResultRepository[
          'FIND_RESULTS_V2_SEARCH_STATIC_RELEVANCE_PLACEHOLDER_COUNT'
        ];
      querySpy.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
      await repository.findResultsV2(
        'john doe',
        undefined,
        undefined,
        emptyFindResultsV2Filters(),
      );
      const countParams = querySpy.mock.calls[0][1] as unknown[];
      const mainParams = querySpy.mock.calls[1][1] as unknown[];
      const countSql = querySpy.mock.calls[0][0] as string;
      const creatorWhereOffset = staticWhereCount;

      expect(countSql).toContain('su.first_name LIKE');
      expect(countParams).toHaveLength(staticWhereCount + 4);
      expect(
        countParams.slice(0, staticWhereCount).every((p) => p === 'john doe'),
      ).toBe(true);
      expect(countParams.slice(creatorWhereOffset)).toEqual([
        'john',
        'john',
        'doe',
        'doe',
      ]);
      const creatorRelevanceEnd = staticRelevanceCount + 4;
      const creatorWhereStart = creatorRelevanceEnd + staticWhereCount;
      expect(
        mainParams.slice(staticRelevanceCount, creatorRelevanceEnd),
      ).toEqual(['john', 'john', 'doe', 'doe']);
      expect(
        mainParams.slice(creatorWhereStart, creatorWhereStart + 4),
      ).toEqual(['john', 'john', 'doe', 'doe']);
    });

    it('strips _search_relevance from returned rows when search is provided', async () => {
      querySpy
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([
          { result_id: 9, title: 'T', _search_relevance: 2000 },
        ]);
      const out = await repository.findResultsV2(
        'STAR-1',
        undefined,
        undefined,
        emptyFindResultsV2Filters(),
      );
      expect(out.data[0]).toEqual({ result_id: 9, title: 'T' });
      expect(out.data[0]).not.toHaveProperty('_search_relevance');
    });

    it('applies onlyOwnResults filter in SQL', async () => {
      querySpy.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
      const filters = emptyFindResultsV2Filters();
      filters.currentUser.onlyOwnResults = true;
      await repository.findResultsV2('', undefined, undefined, filters);
      const mainSql = querySpy.mock.calls[1][0] as string;
      expect(mainSql).toContain('AND r.created_by = 42');
    });

    it('uses custom sort when search is absent', async () => {
      querySpy.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
      await repository.findResultsV2(
        '',
        { page: 2, limit: 5 },
        { field: ResultSortEnum.RESULT_TITLE, order: 'DESC' },
        emptyFindResultsV2Filters(),
      );
      const mainSql = querySpy.mock.calls[1][0] as string;
      expect(mainSql).toContain('ORDER BY r.title DESC');
      expect(querySpy.mock.calls[1][1]).toEqual([5, 5]);
    });

    it('returns pagination metadata from count query', async () => {
      querySpy
        .mockResolvedValueOnce([{ total: 25 }])
        .mockResolvedValueOnce([{ result_id: 1 }, { result_id: 2 }]);
      const out = await repository.findResultsV2(
        '',
        { page: 2, limit: 10 },
        undefined,
        emptyFindResultsV2Filters(),
      );
      expect(out.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        pageSize: 2,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  describe('findPoolFundingAlignmentContext', () => {
    // The effective pool-funding predicate is derived from the single shared
    // helper; tests compare against its output rather than hardcoding the SQL so
    // the assertions never drift from the source of truth.
    const effectivePredicate = effectivePoolFundingContributorSql('ac');

    // R-BIL-103 AC.1 — the results read path projects the effective flag.
    it('projects the effective pool-funding predicate, not the raw column', async () => {
      await repository.findPoolFundingAlignmentContext(123);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain(
        `${effectivePredicate} AS is_pool_funding_contributor`,
      );
      // The pre-change raw projection must be gone.
      expect(sql).not.toContain(
        'COALESCE(ac.is_pool_funding_contributor, FALSE)',
      );
    });

    it('binds the result id as the sole positional parameter', async () => {
      await repository.findPoolFundingAlignmentContext(123);
      expect(querySpy.mock.calls[0][1]).toEqual([123]);
    });

    it('returns the first row when present', async () => {
      const row = {
        result_id: 123,
        is_pool_funding_contributor: true,
      };
      querySpy.mockResolvedValueOnce([row]);
      await expect(
        repository.findPoolFundingAlignmentContext(123),
      ).resolves.toBe(row);
    });

    it('returns null when the query yields no rows', async () => {
      querySpy.mockResolvedValueOnce([]);
      await expect(
        repository.findPoolFundingAlignmentContext(123),
      ).resolves.toBeNull();
    });

    // R-BIL-103 AC.2 — unit-level parity guarantee: because both the results
    // repository and agresso-contract.repository import the same
    // effectivePoolFundingContributorSql('ac') helper, the fragment embedded in
    // this query is string-identical to the one the find-contracts projection,
    // filter, and ordering use. Asserting containment of the helper's exact
    // output proves the two read paths derive the flag identically.
    it('embeds the shared effective predicate string-identically to find-contracts', async () => {
      await repository.findPoolFundingAlignmentContext(123);
      const sql = querySpy.mock.calls[0][0] as string;
      expect(sql).toContain(effectivePredicate);
    });

    // R-BIL-104 / R-BIL-105 — lifecycle semantics live in the predicate itself.
    // The predicate is a pure OR of two branches with no suppress path, so:
    // - the manual-tag branch keeps the badge when tag = 1 (R-BIL-104 AC.2 /
    //   R-BIL-105 AC.2: manual tag persists after a mapping is deactivated);
    // - the active-mapping branch (gated on bpm.is_active = 1) lights the badge
    //   while a mapping is active and drops it once deactivated (R-BIL-104 AC.1);
    // - because the two branches are OR-ed with no override, an active mapping
    //   forces the flag true even over a manual false (R-BIL-105 AC.1).
    it('derives the effective flag as a pure OR of the manual-tag and active-mapping branches', async () => {
      await repository.findPoolFundingAlignmentContext(123);
      const sql = querySpy.mock.calls[0][0] as string;
      // Manual-tag branch — persists the badge for hand-tagged contracts.
      expect(sql).toContain('COALESCE(ac.is_pool_funding_contributor, 0) = 1');
      // Active-mapping branch — correlated on the contract's agreement id and
      // gated on is_active, so deactivation removes the derived badge.
      expect(sql).toContain('bpm.agresso_agreement_id = ac.agreement_id');
      expect(sql).toContain('bpm.is_active = 1');
      // The two branches are OR-ed (no AND / suppress column): pure OR means an
      // active mapping wins over a manual false.
      expect(sql).toMatch(
        /COALESCE\([\s\S]*OR EXISTS[\s\S]*bpm\.is_active = 1/,
      );
    });
  });
});
