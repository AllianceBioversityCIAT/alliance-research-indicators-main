import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import type { FullFiltersReportDto } from '../dto/filters-report.dto';
import { ResultSortEnum } from '../../results/enum/result-sort.enum';
import { ResultRepository } from '../../results/repositories/result.repository';
import { StarResultsExportRepository } from './star-results-export.repository';

describe('StarResultsExportRepository', () => {
  let repo: StarResultsExportRepository;
  const queryRunnerQuery = jest.fn();
  const queryRunnerConnect = jest.fn().mockResolvedValue(undefined);
  const queryRunnerStartTransaction = jest.fn().mockResolvedValue(undefined);
  const queryRunnerCommitTransaction = jest.fn().mockResolvedValue(undefined);
  const queryRunnerRollbackTransaction = jest.fn().mockResolvedValue(undefined);
  const queryRunnerRelease = jest.fn().mockResolvedValue(undefined);
  const createQueryRunner = jest.fn(() => ({
    connect: queryRunnerConnect,
    startTransaction: queryRunnerStartTransaction,
    commitTransaction: queryRunnerCommitTransaction,
    rollbackTransaction: queryRunnerRollbackTransaction,
    release: queryRunnerRelease,
    query: queryRunnerQuery,
  }));
  const findResultsV2 = jest.fn();

  const baseFilters: FullFiltersReportDto = {
    filters: {
      search: '',
      statusCodes: [],
      contractCodes: [],
      years: [],
      platformCode: [],
      indicators: [],
      onlyOwnResults: false,
      currentUserId: 7,
    },
    sorting: { sortOrder: 'DESC', sortField: ResultSortEnum.CODE },
  };

  beforeEach(async () => {
    queryRunnerQuery.mockReset();
    queryRunnerConnect.mockClear();
    queryRunnerStartTransaction.mockClear();
    queryRunnerCommitTransaction.mockClear();
    queryRunnerRollbackTransaction.mockClear();
    queryRunnerRelease.mockClear();
    createQueryRunner.mockClear();
    findResultsV2.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarResultsExportRepository,
        {
          provide: DataSource,
          useValue: { createQueryRunner },
        },
        {
          provide: AppConfig,
          useValue: { ARI_CLIENT_HOST: 'https://app.example' },
        },
        { provide: ResultRepository, useValue: { findResultsV2 } },
      ],
    }).compile();
    repo = module.get(StarResultsExportRepository);
  });

  it('returns empty array when findResultsV2 yields no ids', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [],
      pagination: { hasNextPage: false },
    });
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows).toEqual([]);
    expect(createQueryRunner).not.toHaveBeenCalled();
  });

  it('runs phase-2 SQL when ids exist', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 10 }, { result_id: 20 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ result_code: 'R1' }]);
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows).toEqual([{ result_code: 'R1' }]);
    expect(createQueryRunner).toHaveBeenCalledTimes(1);
    expect(queryRunnerStartTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerCommitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerRelease).toHaveBeenCalledTimes(1);
    expect(queryRunnerQuery).toHaveBeenCalledTimes(2);
    expect(queryRunnerQuery.mock.calls[0][0]).toBe(
      'SET LOCAL group_concat_max_len = 4194304',
    );
    const [sql, params] = queryRunnerQuery.mock.calls[1];
    expect(sql).toContain('WHERE gi.result_id IN');
    expect(sql).toContain('ORDER BY FIELD');
    expect(sql).toContain(
      'LEFT JOIN report_capacity_sharing_development csd ON csd.result_id = gi.result_id',
    );
    expect(sql).toContain(
      'csd.training_engagement_report AS training_engagement_report',
    );
    expect(sql).toContain(
      'csd.group_session_participants_total AS number_people_trained_total',
    );
    expect(sql).toContain(
      'LEFT JOIN report_policy_change pc ON pc.result_id = gi.result_id',
    );
    expect(sql).toContain('pc.policy_type AS policy_type');
    expect(sql).toContain(
      'LEFT JOIN report_innovation_dev idv ON idv.result_id = gi.result_id',
    );
    expect(sql).toContain('idv.short_title AS short_title');
    expect(sql).toContain('idv.link_to_results AS tools_often_used_together');
    expect(sql).toContain('idv.expansion_potential AS expansion_potential');
    expect(sql).toContain(
      'LEFT JOIN report_oicr oc ON oc.result_id = gi.result_id',
    );
    expect(sql).toContain('oc.impact_area AS impact_area');
    expect(sql).toContain('oc.cgspace_link AS cgspace_link');
    expect(sql).toContain('oc.for_external_use AS for_external_use');
    expect(sql).toContain(
      'oc.for_external_use_description AS for_external_use_description',
    );
    expect(sql).toContain(') AS quantification');
    expect(sql).toContain(
      'LEFT JOIN report_link_result lkr ON lkr.result_id = gi.result_id',
    );
    expect(sql).toContain('ev.notable_references AS notable_references');
    expect(sql).toContain('lkr.link_results AS link_results');
    expect(params).toEqual([10, 20, 10, 20]);
  });

  it('paginates findResultsV2 until hasNextPage is false', async () => {
    findResultsV2
      .mockResolvedValueOnce({
        data: [{ result_id: 1 }],
        pagination: { hasNextPage: true },
      })
      .mockResolvedValueOnce({
        data: [{ result_id: 2 }],
        pagination: { hasNextPage: false },
      });
    queryRunnerQuery.mockResolvedValue(undefined);
    await repo.findStarResultsMetadataRows(baseFilters);
    expect(findResultsV2).toHaveBeenCalledTimes(2);
  });

  it('stops pagination when data is empty even if hasNextPage is true', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [],
      pagination: { hasNextPage: true },
    });
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows).toEqual([]);
    expect(findResultsV2).toHaveBeenCalledTimes(1);
  });

  it('maps DTO filters with defaults for optional fields', async () => {
    findResultsV2.mockResolvedValue({
      data: [{ result_id: 5 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery.mockResolvedValue(undefined);
    const filters: FullFiltersReportDto = {
      filters: {
        search: 'x',
        statusCodes: undefined as unknown as [],
        contractCodes: undefined as unknown as [],
        years: undefined as unknown as [],
        platformCode: undefined as unknown as [],
        indicators: undefined as unknown as [],
        onlyOwnResults: undefined as unknown as false,
        currentUserId: undefined,
      },
      sorting: { sortOrder: 'ASC', sortField: ResultSortEnum.RESULT_TITLE },
    };
    await repo.findStarResultsMetadataRows(filters);
    expect(findResultsV2).toHaveBeenCalledWith(
      'x',
      expect.any(Object),
      { field: ResultSortEnum.RESULT_TITLE, order: 'ASC' },
      expect.objectContaining({
        status: [],
        contracts: [],
        years: [],
        sources: [],
        indicators: [],
        currentUser: { onlyOwnResults: false, userId: 0 },
      }),
    );
  });

  it('treats missing search as empty string', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 1 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery.mockResolvedValue(undefined);
    const filters = {
      ...baseFilters,
      filters: {
        ...baseFilters.filters,
        search: undefined as unknown as string,
      },
    };
    await repo.findStarResultsMetadataRows(filters);
    expect(findResultsV2).toHaveBeenCalledWith(
      '',
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('embeds ARI_CLIENT_HOST in SQL for STAR platform link', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 1 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery.mockResolvedValue(undefined);
    await repo.findStarResultsMetadataRows(baseFilters);
    const [sql] = queryRunnerQuery.mock.calls[1];
    expect(sql).toContain('https://app.example/result/STAR-');
  });

  it('rolls back and rethrows when phase-2 query fails', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 1 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('db'));
    await expect(repo.findStarResultsMetadataRows(baseFilters)).rejects.toThrow(
      'db',
    );
    expect(queryRunnerRollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerCommitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerRelease).toHaveBeenCalledTimes(1);
  });
});
