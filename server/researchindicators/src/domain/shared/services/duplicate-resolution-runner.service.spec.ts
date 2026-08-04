import { DataSource } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ResultDeleteStatus } from '../utils/query.service';
import {
  DuplicateGroupClassification,
  DuplicateRule,
} from '../utils/duplicate-result-priority.util';
import {
  DuplicateResolutionMode,
  DuplicateResolutionSource,
  DuplicateRowOutcome,
} from '../../entities/results/entities/result-duplicate-resolution-log.entity';
import {
  DuplicateResolutionRunner,
  HARD_DELETE_ENABLED_KEY,
} from './duplicate-resolution-runner.service';

const order: string[] = [];

const build = (options: {
  hardDelete?: string | null;
  configThrows?: boolean;
  protectedIds?: number[];
  deleteStatus?: ResultDeleteStatus;
  deleteThrows?: boolean;
}) => {
  order.length = 0;

  const dataSource = {
    query: jest.fn(async () => {
      if (options.configThrows) throw new Error('app_config unavailable');
      return options.hardDelete === undefined
        ? [{ value: 'true' }]
        : options.hardDelete === null
          ? []
          : [{ value: options.hardDelete }];
    }),
  } as unknown as DataSource;

  const queryService = {
    resolveResultDeleteScope: jest.fn(async (id: number) => ({
      seedId: id,
      isSnapshot: false,
      reportYearId: 2024,
      targetIds: [id, id + 1],
      siblingIdsOutsideReportYear: [],
    })),
    deleteFullResultById: jest.fn(async (id: number) => {
      order.push('delete');
      if (options.deleteThrows) throw new Error('errno 1451');
      return [
        {
          resultId: id,
          status: options.deleteStatus ?? ResultDeleteStatus.DELETED,
        },
      ];
    }),
  };

  const starRelationships = {
    evaluate: jest.fn(async () => {
      order.push('guard');
      return {
        protectedResultIds: options.protectedIds ?? [],
        relationships: (options.protectedIds ?? []).map((id) => ({
          resultId: id,
          kind: 'STAR_LINKS_TO_RESULT',
          counterpartResultId: 900,
          linkResultId: 1,
          linkIsActive: true,
        })),
        inactiveLinkOnlyResultIds: [],
      };
    }),
  };

  const auditLog = {
    recordGroup: jest.fn(async (_input: Record<string, unknown>) => {
      order.push('audit');
      return 42;
    }),
    recordOutcomes: jest.fn(async () => undefined),
    logNotableOutcomes: jest.fn(),
  };

  const runner = new DuplicateResolutionRunner(
    dataSource,
    queryService as never,
    starRelationships as never,
    auditLog as never,
  );
  return { runner, queryService, starRelationships, auditLog, dataSource };
};

const participant = (
  resultId: number | null,
  platformCode: ReportingPlatformEnum,
  indicatorId: IndicatorsEnum,
) => ({
  resultId,
  platformCode,
  indicatorId,
  reportYearId: 2024,
  resultOfficialCode: resultId ? resultId * 10 : null,
  rawPublicLink: 'https://example.org/doc',
  normalizedPublicLink: 'example.org/doc',
});

const winner = participant(
  10,
  ReportingPlatformEnum.TIP,
  IndicatorsEnum.KNOWLEDGE_PRODUCT,
);
const loser = participant(
  20,
  ReportingPlatformEnum.PRMS,
  IndicatorsEnum.KNOWLEDGE_PRODUCT,
);

const resolvedGroup = {
  classification: DuplicateGroupClassification.RESOLVED,
  winner,
  losers: [loser],
  untouched: [winner],
  survivors: [winner],
  rule: DuplicateRule.RULE_1_TIP,
  decidedBy: 10,
};

const input = (resolution = resolvedGroup) => ({
  context: {
    runId: 'run-1',
    source: DuplicateResolutionSource.SYNC_TIP,
    mode: DuplicateResolutionMode.SYNC,
  },
  normalizedPublicLink: 'example.org/doc',
  participants: [winner, loser],
  resolution: resolution as never,
});

describe('DuplicateResolutionRunner — order is the safety property', () => {
  it('guards, then audits, then deletes', async () => {
    // Guard first so a protected row is never touched. Audit second because under
    // a hard delete the participant payload is the only surviving trace.
    const { runner } = build({});

    await runner.applyGroup(input());

    expect(order).toEqual(['guard', 'audit', 'delete']);
  });

  it('guards the whole expanded family, not the loser seed row', async () => {
    const { runner, starRelationships, queryService } = build({});

    await runner.applyGroup(input());

    expect(queryService.resolveResultDeleteScope).toHaveBeenCalledWith(20);
    expect(starRelationships.evaluate).toHaveBeenCalledWith([20, 21]);
  });

  it('writes exactly one audit record for one group', async () => {
    const { runner, auditLog } = build({});

    await runner.applyGroup(input());

    expect(auditLog.recordGroup).toHaveBeenCalledTimes(1);
    expect(auditLog.recordOutcomes).toHaveBeenCalledTimes(1);
  });

  it('records the winner, the deciding rule and the deciding row', async () => {
    const { runner, auditLog } = build({});

    await runner.applyGroup(input());

    expect(auditLog.recordGroup.mock.calls[0][0]).toMatchObject({
      winnerResultId: 10,
      decidingRule: DuplicateRule.RULE_1_TIP,
      decidingResultId: 10,
      classification: DuplicateGroupClassification.RESOLVED,
    });
  });
});

describe('DuplicateResolutionRunner — protection wins over deletion', () => {
  it('does not delete a protected loser, and says why', async () => {
    const { runner, queryService } = build({ protectedIds: [21] });

    const report = await runner.applyGroup(input());

    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(report.protectedRows).toBe(1);
    const outcome = report.outcomes.find((entry) => entry.resultId === 20);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.PROTECTED);
    expect(outcome?.reason).toContain('21');
    expect(outcome?.protectingRelationships).toHaveLength(1);
  });

  it('records the expanded family on the outcome for traceability', async () => {
    const { runner } = build({});

    const report = await runner.applyGroup(input());

    expect(
      report.outcomes.find((entry) => entry.resultId === 20)?.expandedResultIds,
    ).toEqual([20, 21]);
  });
});

describe('DuplicateResolutionRunner — the hard-delete flag', () => {
  it('audits but deletes nothing when the flag is absent', async () => {
    // Default false. "Detect and report, do not delete" — and deliberately NOT a
    // fallback to soft delete, because the soft delete is the reported bug.
    const { runner, queryService, auditLog } = build({ hardDelete: null });

    const report = await runner.applyGroup(input());

    expect(auditLog.recordGroup).toHaveBeenCalledTimes(1);
    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(report.hardDeleteEnabled).toBe(false);
    expect(report.outcomes.find((e) => e.resultId === 20)?.outcome).toBe(
      DuplicateRowOutcome.PLANNED,
    );
  });

  it('stays disabled when the flag is explicitly false', async () => {
    const { runner, queryService } = build({ hardDelete: 'false' });
    const report = await runner.applyGroup(input());
    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(report.hardDeleteEnabled).toBe(false);
  });

  it('stays disabled when the config read fails', async () => {
    const { runner, queryService } = build({ configThrows: true });
    const report = await runner.applyGroup(input());
    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(report.hardDeleteEnabled).toBe(false);
  });

  it('reads the documented config key', async () => {
    const { runner, dataSource } = build({});
    await runner.applyGroup(input());
    expect((dataSource.query as jest.Mock).mock.calls[0][1]).toEqual([
      HARD_DELETE_ENABLED_KEY,
    ]);
  });

  it('never deletes in DRY_RUN, even with the flag on', async () => {
    const { runner, queryService, dataSource } = build({ hardDelete: 'true' });

    const report = await runner.applyGroup({
      ...input(),
      context: {
        runId: 'run-1',
        source: DuplicateResolutionSource.SWEEP,
        mode: DuplicateResolutionMode.DRY_RUN,
      },
    });

    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(report.hardDeleteEnabled).toBe(false);
    // The flag is not even consulted: a dry run is write-free by construction.
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});

describe('DuplicateResolutionRunner — failures are recorded, never rethrown', () => {
  it('records FAILED and resolves normally when a delete throws', async () => {
    // Rethrowing would reach the caller's catch, which rolls back the winner — so
    // a cleanup failure would destroy the row the cleanup was protecting.
    const { runner } = build({ deleteThrows: true });

    const report = await runner.applyGroup(input());

    expect(report.failed).toBe(1);
    const outcome = report.outcomes.find((entry) => entry.resultId === 20);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.FAILED);
    expect(outcome?.reason).toContain('errno 1451');
  });

  it('records NOOP when the row was already gone', async () => {
    const { runner } = build({ deleteStatus: ResultDeleteStatus.NOOP });

    const report = await runner.applyGroup(input());

    expect(report.deleted).toBe(0);
    expect(report.outcomes.find((e) => e.resultId === 20)?.outcome).toBe(
      DuplicateRowOutcome.NOOP,
    );
  });

  it('surfaces protections and failures through the log helper', async () => {
    const { runner, auditLog } = build({ deleteThrows: true });
    await runner.applyGroup(input());
    expect(auditLog.logNotableOutcomes).toHaveBeenCalledWith(
      'run-1',
      expect.arrayContaining([
        expect.objectContaining({ outcome: DuplicateRowOutcome.FAILED }),
      ]),
    );
  });
});

describe('DuplicateResolutionRunner — non-resolved groups', () => {
  it('audits a contradictory group and deletes nothing', async () => {
    const { runner, queryService, auditLog } = build({});

    const report = await runner.applyGroup(
      input({
        ...resolvedGroup,
        classification: DuplicateGroupClassification.UNRESOLVED_CONFLICT,
        winner: null,
        losers: [],
        untouched: [winner, loser],
        survivors: [],
        rule: DuplicateRule.NONE,
        decidedBy: null,
        reason: 'The approved rules contradict each other (OQ-9).',
      } as never),
    );

    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    expect(auditLog.recordGroup.mock.calls[0][0]).toMatchObject({
      classification: DuplicateGroupClassification.UNRESOLVED_CONFLICT,
      winnerResultId: null,
      decidingResultId: null,
    });
    expect(report.deleted).toBe(0);
  });

  it('marks a prospective incoming loser as OMITTED rather than trying to delete it', async () => {
    const prospective = participant(
      null,
      ReportingPlatformEnum.PRMS,
      IndicatorsEnum.KNOWLEDGE_PRODUCT,
    );
    const { runner, queryService } = build({});

    const report = await runner.applyGroup({
      ...input({
        ...resolvedGroup,
        losers: [prospective],
        untouched: [winner],
      } as never),
      participants: [winner, prospective],
    });

    expect(queryService.resolveResultDeleteScope).not.toHaveBeenCalled();
    expect(report.outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resultId: null,
          outcome: DuplicateRowOutcome.OMITTED,
        }),
      ]),
    );
  });
});
