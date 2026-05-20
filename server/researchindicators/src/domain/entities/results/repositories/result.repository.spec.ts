import { DataSource } from 'typeorm';
import { ResultRepository, ResultFiltersInterface } from './result.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { FindAllOptions } from '../../../shared/enum/find-all-options';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { SecUser } from '../../../complementary-entities/secondary/user/dto/sec-user.dto';

describe('ResultRepository', () => {
  let repository: ResultRepository;
  let querySpy: jest.SpyInstance;

  const appConfig = {
    ARI_MYSQL_NAME: 'test_schema',
  } as AppConfig;

  const currentUserUtil = {} as CurrentUserUtil;

  const createDataSource = () =>
    ({
      createEntityManager: jest.fn().mockReturnValue({}),
      getRepository: jest.fn(),
    }) as unknown as DataSource;

  let dataSource: DataSource;

  beforeEach(() => {
    dataSource = createDataSource();
    repository = new ResultRepository(appConfig, currentUserUtil, dataSource);
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

  describe('findPoolFundingAlignmentContext', () => {
    it('returns first result context row', async () => {
      querySpy.mockResolvedValueOnce([
        {
          result_id: 77,
          result_official_code: 123,
          result_status_id: 24,
          version_id: 2,
          report_year_id: 2026,
          is_synced_to_prms: 0,
          is_pool_funding_contributor: 1,
        },
      ]);

      await expect(
        repository.findPoolFundingAlignmentContext(77),
      ).resolves.toEqual({
        result_id: 77,
        result_official_code: 123,
        result_status_id: 24,
        version_id: 2,
        report_year_id: 2026,
        is_synced_to_prms: 0,
        is_pool_funding_contributor: 1,
      });
      expect(querySpy).toHaveBeenCalledWith(expect.any(String), [77]);
    });

    it('returns null when result context is missing', async () => {
      querySpy.mockResolvedValueOnce([]);

      await expect(
        repository.findPoolFundingAlignmentContext(77),
      ).resolves.toBeNull();
    });

    it('joins the primary result contract and AGRESSO tag', async () => {
      await repository.findPoolFundingAlignmentContext(77);
      const sql = querySpy.mock.calls[0][0] as string;

      expect(sql).toContain('LEFT JOIN result_contracts rc');
      expect(sql).toContain('AND rc.is_primary = TRUE');
      expect(sql).toContain('LEFT JOIN agresso_contracts ac');
      expect(sql).toContain('ac.is_pool_funding_contributor');
      expect(sql).toContain('r.version_id');
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
});
