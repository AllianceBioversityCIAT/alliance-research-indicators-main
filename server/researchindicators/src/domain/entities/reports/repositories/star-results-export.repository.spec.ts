import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import type { FullFiltersReportDto } from '../dto/filters-report.dto';
import { ResultSortEnum } from '../../results/enum/result-sort.enum';
import { ResultRepository } from '../../results/repositories/result.repository';
import { StarResultsExportRepository } from './star-results-export.repository';

describe('StarResultsExportRepository', () => {
  let repo: StarResultsExportRepository;
  const dataSourceQuery = jest.fn();
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
    dataSourceQuery.mockReset();
    findResultsV2.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StarResultsExportRepository,
        { provide: DataSource, useValue: { query: dataSourceQuery } },
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
    expect(dataSourceQuery).not.toHaveBeenCalled();
  });

  it('runs phase-2 SQL when ids exist', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 10 }, { result_id: 20 }],
      pagination: { hasNextPage: false },
    });
    dataSourceQuery.mockResolvedValueOnce([{ result_code: 'R1' }]);
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows).toEqual([{ result_code: 'R1' }]);
    expect(dataSourceQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = dataSourceQuery.mock.calls[0];
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
    dataSourceQuery.mockResolvedValueOnce([]);
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
    dataSourceQuery.mockResolvedValue([]);
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
    dataSourceQuery.mockResolvedValueOnce([]);
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
    dataSourceQuery.mockResolvedValueOnce([]);
    await repo.findStarResultsMetadataRows(baseFilters);
    const [sql] = dataSourceQuery.mock.calls[0];
    expect(sql).toContain('https://app.example/result/STAR-');
  });
});
