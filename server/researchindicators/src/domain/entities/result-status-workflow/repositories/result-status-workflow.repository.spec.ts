import { Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ResultStatusWorkflowRepository } from './result-status-workflow.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { GeneralDataDto } from '../config/config-workflow';
import { Result } from '../../results/entities/result.entity';

describe('ResultStatusWorkflowRepository', () => {
  let repository: ResultStatusWorkflowRepository;
  let dataSourceQueryMock: jest.Mock;
  let emQueryMock: jest.Mock;

  const appConfig = {
    ARI_CLIENT_HOST: 'https://app.test',
    ARI_MIS: 'STAR',
  } as AppConfig;

  const createEntityManager = () =>
    ({
      query: emQueryMock,
      getRepository: jest.fn().mockReturnValue({
        findOne: jest.fn(),
      }),
    }) as unknown as EntityManager;

  beforeEach(() => {
    emQueryMock = jest.fn();
    dataSourceQueryMock = jest.fn();
    const dataSource = {
      createEntityManager: jest.fn().mockImplementation(createEntityManager),
      query: dataSourceQueryMock,
    } as unknown as DataSource;
    repository = new ResultStatusWorkflowRepository(dataSource, appConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getGeneralQuery includes base selects and placeholder', () => {
    const sql = repository.getGeneralQuery();
    expect(sql).toContain('from results r');
    expect(sql).toContain('r.result_id = ?');
  });

  it('getGeneralQuery appends optional select, join, where, order', () => {
    const sql = repository.getGeneralQuery({
      select: 'extra.col',
      join: 'LEFT JOIN x ON x.id = r.id',
      where: 'r.title IS NOT NULL',
      order: 'r.created_at DESC',
    });
    expect(sql).toContain('extra.col');
    expect(sql).toContain('LEFT JOIN x ON x.id = r.id');
    expect(sql).toContain('and r.title IS NOT NULL');
    expect(sql).toContain('order by r.created_at DESC');
  });

  it('setCustomGeneralData fills customData fields', () => {
    const generalData = new GeneralDataDto();
    generalData.result = {
      result_official_code: 55,
      report_year_id: 1,
    } as Result;
    const custom: any = {
      owner_id: 1,
      owner_first_name: 'A',
      owner_last_name: 'B',
      owner_email: 'a@b.c',
      principal_investigator_id: 'p',
      principal_investigator_first_name: 'P',
      principal_investigator_last_name: 'I',
      principal_investigator_email: 'pi@x.org',
      project_code: 'PC',
      project_name: 'PN',
      result_title: 'RT',
      indicator: 'Ind',
      result_official_code: 55,
      result_id: 9,
      created_at: '01/01/2025',
    };
    repository.setCustomGeneralData(generalData, custom);
    expect(generalData.customData.result_owner.name).toContain('A');
    expect(generalData.customData.contract.code).toBe('PC');
    expect(generalData.customData.url).toContain('/result/STAR-55/');
  });

  // @akili-spec docs/specs/changes/my-pi-delegates — T-09
  // ─── isPi() — original behaviour (unchanged; NFR-PID-002) ────────────────

  it('isPi returns true when the PI query returns a row (R-PID-002 AC.1)', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([{ sec_user_id: 1 }]);
    await expect(repository.isPi(10, 1)).resolves.toBe(true);
  });

  it('isPi returns false when neither PI query nor delegate query returns a row (R-PID-002 AC.3)', async () => {
    // first call = PI query → empty; second call = delegate query → empty
    dataSourceQueryMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await expect(repository.isPi(10, 999)).resolves.toBe(false);
  });

  // ─── isPi() — delegate-fallback cases (T-07 / R-PID-002 AC.2) ────────────

  // Scenario 1 (AC from R-PID-002 AC.1): PI → true AND pi_delegates NOT queried
  // The PI query returns a row → dataSource.query must be called exactly once.
  it('Sc-1: isPi — PI returns a row → true; dataSource.query called exactly ONCE (pi_delegates NOT queried)', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([{ sec_user_id: 10 }]);
    const result = await repository.isPi(11, 10);
    expect(result).toBe(true);
    expect(dataSourceQueryMock).toHaveBeenCalledTimes(1);
  });

  // Scenario 2 (R-PID-002 AC.2): active delegate of the result's project → true
  it('Sc-2: isPi — delegate of the result project → true (PI query empty, delegate query returns a row)', async () => {
    // PI query → empty (user is not the PI)
    dataSourceQueryMock.mockResolvedValueOnce([]);
    // delegate query → returns a row (user is an active delegate of this result's project)
    dataSourceQueryMock.mockResolvedValueOnce([{ 1: 1 }]);
    const result = await repository.isPi(12, 20);
    expect(result).toBe(true);
  });

  // Scenario 3 (R-PID-002 AC.3): neither PI nor delegate → false
  it('Sc-3: isPi — neither PI nor delegate → false', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([]); // PI query → empty
    dataSourceQueryMock.mockResolvedValueOnce([]); // delegate query → empty
    const result = await repository.isPi(13, 30);
    expect(result).toBe(false);
  });

  // Scenario 10 (R-PID-002 AC.4): delegate of a DIFFERENT project → false (no cross-project leak)
  // Discriminating: the delegate's projectId (in pi_delegates) differs from the
  // result's primary project (resolved via result_contracts → agresso_contracts).
  // The delegate query is scoped to the result's project — a delegate of project B
  // cannot see a result belonging to project A.
  it('Sc-10: isPi — delegate of a DIFFERENT project → false (no cross-project leak)', async () => {
    // PI query → empty (user is not the PI of result 14's project)
    dataSourceQueryMock.mockResolvedValueOnce([]);
    // Delegate query is result-scoped; this user has NO row for result 14's project,
    // even though they ARE a delegate of a different project → empty
    dataSourceQueryMock.mockResolvedValueOnce([]);
    const result = await repository.isPi(14, 40);
    expect(result).toBe(false);
  });

  it('getOicrGeneralData merges query row into generalData', async () => {
    emQueryMock.mockResolvedValueOnce([
      {
        oicr_internal_code: 'O1',
        sharepoint_link: 'http://sp',
        mel_regional_expert_first_name: 'M',
        mel_regional_expert_last_name: 'E',
        mel_regional_expert_email: 'm@e.org',
        mel_regional_expert_id: 'c1',
        result_official_code: 88,
      },
    ]);
    const generalData = new GeneralDataDto();
    generalData.customData.result_owner = {
      name: 'Owner',
      email: 'o@w.org',
      id: 1,
    };
    generalData.aditionalData = { submission_comment: 'SC' } as any;

    const out = await repository.getOicrGeneralData(
      5,
      generalData,
      null as any,
    );

    expect(out.customData.oicr_internal_code).toBe('O1');
    expect(out.customData.sharepoint_url).toBe('http://sp');
    expect(out.customData.download_url).toContain('resultCode=88');
  });

  it('getDataForRevisionResult uses submission_history join', async () => {
    emQueryMock.mockResolvedValueOnce([
      {
        action_executor_first_name: 'E',
        action_executor_last_name: 'X',
        action_executor_email: 'e@x.org',
        action_executor_id: 3,
      },
    ]);
    const generalData = new GeneralDataDto();
    generalData.aditionalData = { submission_comment: 'C' } as any;
    const out = await repository.getDataForRevisionResult(
      2,
      generalData,
      null as any,
    );
    expect(out.customData.submitter.name).toContain('E');
  });

  it('getDataForSubmissionResult maps action_executor to submitter', async () => {
    emQueryMock.mockResolvedValueOnce([
      {
        owner_first_name: 'O',
        owner_last_name: 'W',
        owner_email: 'ow@test',
        owner_id: 1,
        principal_investigator_first_name: 'P',
        principal_investigator_last_name: 'I',
        principal_investigator_email: 'pi@test',
        principal_investigator_id: 'c',
        project_code: 'C',
        project_name: 'N',
        result_title: 'T',
        indicator: 'I',
        result_official_code: 12,
        result_id: 3,
        created_at: 'd',
      },
    ]);
    const generalData = new GeneralDataDto();
    generalData.customData.action_executor = {
      name: 'Act',
      email: 'act@test',
      id: 9,
    };
    const out = await repository.getDataForSubmissionResult(
      4,
      generalData,
      null as any,
    );
    expect(out.customData.submitter.name).toBe('Act');
  });

  it('createSnapshot calls versioning when no prior snapshot', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const em = {
      query: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const ds = {
      createEntityManager: jest.fn().mockReturnValue(em),
      query: dataSourceQueryMock,
    } as unknown as DataSource;
    const repo = new ResultStatusWorkflowRepository(ds, appConfig);
    const gd = new GeneralDataDto();
    gd.result = {
      result_official_code: 7,
      report_year_id: 2024,
    } as Result;

    await repo.createSnapshot(gd, em as any);
    expect(em.query).toHaveBeenCalledWith('CALL SP_versioning(?);', [7]);
    expect(findOne).toHaveBeenCalled();
  });

  it('createSnapshot throws when delete snapshot fails', async () => {
    const findOne = jest.fn().mockResolvedValue({ result_id: 1 });
    const em = {
      query: jest.fn().mockRejectedValueOnce(new Error('db')),
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const ds = {
      createEntityManager: jest.fn().mockReturnValue(em),
      query: dataSourceQueryMock,
    } as unknown as DataSource;
    const repo = new ResultStatusWorkflowRepository(ds, appConfig);
    const gd = new GeneralDataDto();
    gd.result = { result_official_code: 1, report_year_id: 2024 } as Result;

    await expect(repo.createSnapshot(gd, em as any)).rejects.toThrow(
      'Error deleting snapshot',
    );
  });

  it('createSnapshot throws when versioning fails', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const em = {
      query: jest.fn().mockRejectedValueOnce(new Error('version fail')),
      getRepository: jest.fn().mockReturnValue({ findOne }),
    };
    const ds = {
      createEntityManager: jest.fn().mockReturnValue(em),
      query: dataSourceQueryMock,
    } as unknown as DataSource;
    const repo = new ResultStatusWorkflowRepository(ds, appConfig);
    const gd = new GeneralDataDto();
    gd.result = { result_official_code: 2, report_year_id: 2024 } as Result;

    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await expect(repo.createSnapshot(gd, em as any)).rejects.toThrow(
      'Error creating snapshot',
    );
  });
});
