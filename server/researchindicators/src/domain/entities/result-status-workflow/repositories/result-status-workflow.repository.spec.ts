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

  it('isPi returns boolean from query length', async () => {
    dataSourceQueryMock.mockResolvedValueOnce([{ sec_user_id: 1 }]);
    await expect(repository.isPi(1, 2)).resolves.toBe(true);
    dataSourceQueryMock.mockResolvedValueOnce([]);
    await expect(repository.isPi(1, 2)).resolves.toBe(false);
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
