import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import type { FullFiltersReportDto } from '../dto/filters-report.dto';
import { ResultSortEnum } from '../../results/enum/result-sort.enum';
import { ResultRepository } from '../../results/repositories/result.repository';
import { StarResultsExportRepository } from './star-results-export.repository';

/** Design §3.2 aliases, column order 81–111. */
const INNOVATION_DEV_ALIASES = [
  'innovation_dev_short_title',
  'innovation_dev_nature',
  'innovation_dev_type',
  'innovation_dev_is_new_variety',
  'innovation_dev_varieties_count',
  'innovation_dev_readiness_level',
  'innovation_dev_readiness_explanation',
  'innovation_dev_anticipated_users',
  'innovation_dev_actors',
  'innovation_dev_organizations',
  'innovation_dev_beneficiaries',
  'innovation_dev_expected_outcome',
  'innovation_dev_knowledge_sharing',
  'innovation_dev_dissemination',
  'innovation_dev_tool_useful_context',
  'innovation_dev_results_achieved_expected',
  'innovation_dev_tool_functions',
  'innovation_dev_used_beyond_context',
  'innovation_dev_adoption_context',
  'innovation_dev_linked_tools',
  'innovation_dev_other_tools',
  'innovation_dev_other_tools_integration',
  'innovation_dev_cheaper',
  'innovation_dev_simpler',
  'innovation_dev_performs_better',
  'innovation_dev_desirable',
  'innovation_dev_commercial_viability',
  'innovation_dev_enabling_environment',
  'innovation_dev_evidence_of_uptake',
  'innovation_dev_expansion_potential',
  'innovation_dev_expansion_details',
] as const;

const NOT_APPLICABLE = 'Not applicable';

function notApplicableDevCells(): Record<string, string> {
  return Object.fromEntries(
    INNOVATION_DEV_ALIASES.map((key) => [key, NOT_APPLICABLE]),
  );
}

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
    expect(queryRunnerQuery).not.toHaveBeenCalled();
  });

  it('runs phase-2 SQL when ids exist', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 10 }, { result_id: 20 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ result_code: 'R1' }])
      .mockResolvedValueOnce([]);
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows).toEqual([{ result_code: 'R1', ...notApplicableDevCells() }]);
    expect(createQueryRunner).toHaveBeenCalledTimes(1);
    expect(queryRunnerStartTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerCommitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerRelease).toHaveBeenCalledTimes(1);
    expect(queryRunnerQuery).toHaveBeenCalledTimes(3);
    expect(queryRunnerQuery.mock.calls[0][0]).toBe(
      'SET LOCAL group_concat_max_len = 4194304',
    );
    const [sql, params] = queryRunnerQuery.mock.calls[1];
    expect(sql).toContain('gi.result_id AS result_id');
    expect(sql).toContain('WHERE gi.result_id IN');
    expect(sql).not.toContain('report_innovation_dev');
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
      'LEFT JOIN report_oicr oc ON oc.result_id = gi.result_id',
    );
    expect(sql).toContain('aa.strategic_objectives AS strategic_objectives');
    expect(sql).toContain('aa.impact_outcomes AS impact_outcomes');
    expect(sql).toContain('aa.sdgs AS sdgs');
    expect(sql).toContain('oc.impact_area AS impact_area');
    expect(sql).toContain('oc.cgspace_link AS cgspace_link');
    expect(sql).toContain('oc.for_external_use AS for_external_use');
    expect(sql).toContain(
      'oc.for_external_use_description AS for_external_use_description',
    );
    expect(sql).toContain('oc.quantifications AS quantification_actual_count');
    expect(sql).toContain(
      'oc.extrapolated_estimates AS quantification_extrapolated_estimates',
    );
    expect(sql).not.toContain(') AS quantification');
    expect(sql).toContain(
      'LEFT JOIN report_link_result lkr ON lkr.result_id = gi.result_id',
    );
    expect(sql).toContain('ev.notable_references AS notable_references');
    expect(sql).toContain('lkr.link_results AS link_results');
    expect(sql).toContain(
      'LEFT JOIN report_innovation_use iu ON iu.result_id = gi.result_id',
    );
    expect(sql).toContain('iu.innovation_use_level AS innovation_use_level');
    expect(sql).toContain(
      'iu.innovation_use_level_explanation AS innovation_use_level_explanation',
    );
    expect(sql).toContain('iu.innovation_use_actors AS innovation_use_actors');
    expect(sql).toContain(
      'iu.innovation_use_organizations AS innovation_use_organizations',
    );
    expect(sql).toContain(
      'iu.innovation_use_quantifications AS innovation_use_quantifications',
    );
    expect(sql).toContain(
      'iu.innovation_use_linked_dev AS innovation_use_linked_dev',
    );
    expect(sql).toContain(
      "CONCAT('https://app.example/result/', iu.innovation_use_linked_dev_code, '/general-information') AS innovation_use_linked_dev_url",
    );
    expect(sql).not.toContain(
      'iu.innovation_use_linked_dev_readiness AS innovation_use_linked_dev_readiness',
    );
    expect(sql).not.toContain(
      'iu.innovation_use_linked_dev_description AS innovation_use_linked_dev_description',
    );
    expect(sql).not.toContain(
      'iu.innovation_use_linked_dev_geo_scope AS innovation_use_linked_dev_geo_scope',
    );
    expect(params).toEqual([10, 20, 10, 20]);
    const [phase3Sql, phase3Params] = queryRunnerQuery.mock.calls[2];
    expect(phase3Sql).toBe(
      `SELECT result_id, ${INNOVATION_DEV_ALIASES.join(', ')} FROM report_innovation_dev WHERE result_id IN (?,?)`,
    );
    expect(phase3Params).toEqual([10, 20]);
    expect(phase3Sql.match(/\?/g)).toHaveLength(2);
  });

  it('merges Phase 3 by String(result_id), keeps Phase 2 order, and fills Not applicable when Phase 3 has no row', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 7 }, { result_id: 8 }],
      pagination: { hasNextPage: false },
    });
    const devValues = Object.fromEntries(
      INNOVATION_DEV_ALIASES.map((key, index) => [key, `dev-${index}`]),
    );
    queryRunnerQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([
        { result_id: 7, result_code: 'KEEP-7' },
        { result_id: 8, result_code: 'KEEP-8' },
      ])
      .mockResolvedValueOnce([{ result_id: '7', ...devValues }]);
    const rows = await repo.findStarResultsMetadataRows(baseFilters);
    expect(rows.map((row) => row.result_code)).toEqual(['KEEP-7', 'KEEP-8']);
    expect(rows[0].result_id).toBe(7);
    expect(rows[0]).toMatchObject(devValues);
    expect(rows[1]).toMatchObject({
      result_id: 8,
      result_code: 'KEEP-8',
      ...notApplicableDevCells(),
    });
    expect(createQueryRunner).toHaveBeenCalledTimes(1);
    expect(queryRunnerQuery).toHaveBeenCalledTimes(3);
    const startOrder = queryRunnerStartTransaction.mock.invocationCallOrder[0];
    const phase3Order = queryRunnerQuery.mock.invocationCallOrder[2];
    const commitOrder =
      queryRunnerCommitTransaction.mock.invocationCallOrder[0];
    expect(startOrder).toBeLessThan(phase3Order);
    expect(phase3Order).toBeLessThan(commitOrder);
    expect(queryRunnerRollbackTransaction).not.toHaveBeenCalled();
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
    queryRunnerQuery.mockResolvedValue([]);
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
    queryRunnerQuery.mockResolvedValue([]);
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
    queryRunnerQuery.mockResolvedValue([]);
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
    queryRunnerQuery.mockResolvedValue([]);
    await repo.findStarResultsMetadataRows(baseFilters);
    const [sql] = queryRunnerQuery.mock.calls[1];
    expect(sql).toContain('https://app.example/result/STAR-');
  });

  it('selects the group-session organizations on behalf from result_institutions role 2', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 1 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery.mockResolvedValue([]);
    await repo.findStarResultsMetadataRows(baseFilters);
    const [sql] = queryRunnerQuery.mock.calls[1];
    expect(sql).toContain(
      'oob.organizations_on_behalf AS organizations_on_behalf',
    );
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('WHERE ri.result_id = gi.result_id');
    expect(sql).toContain('AND ri.institution_role_id = 2');
    expect(sql).toContain('AND rcs.session_format_id = 2');
    expect(sql).toContain('AND rcs.is_attending_organization = TRUE');
    expect(sql).toContain('r.indicator_id = 1');
    expect(sql).toContain(') oob ON TRUE');
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

  it('rolls back and rethrows when the phase-3 query fails', async () => {
    findResultsV2.mockResolvedValueOnce({
      data: [{ result_id: 1 }],
      pagination: { hasNextPage: false },
    });
    queryRunnerQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([{ result_id: 1, result_code: 'R1' }])
      .mockRejectedValueOnce(new Error('phase3'));
    await expect(repo.findStarResultsMetadataRows(baseFilters)).rejects.toThrow(
      'phase3',
    );
    expect(queryRunnerRollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunnerCommitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerRelease).toHaveBeenCalledTimes(1);
    expect(queryRunnerQuery).toHaveBeenCalledTimes(3);
  });
});
