import { DataSource } from 'typeorm';
import {
  DuplicateResolutionMode,
  DuplicateResolutionSource,
  DuplicateRowOutcome,
  ResultDuplicateResolutionLog,
} from './entities/result-duplicate-resolution-log.entity';
import {
  RecordGroupInput,
  ResultDuplicateResolutionLogService,
} from './result-duplicate-resolution-log.service';

const buildService = (rows: Partial<ResultDuplicateResolutionLog>[] = []) => {
  type Entity = Record<string, unknown>;
  const repository = {
    create: jest.fn((entity: Entity): Entity => entity),
    save: jest.fn(async (entity: Entity) => ({ ...entity, id: 7 })),
    update: jest.fn(async (_id: number, _patch: Entity) => ({ affected: 1 })),
    find: jest.fn(async (_options?: unknown) => rows),
  };
  const dataSource = {
    getRepository: jest.fn(() => repository),
  } as unknown as DataSource;
  return {
    service: new ResultDuplicateResolutionLogService(dataSource),
    repository,
  };
};

const baseInput = (
  overrides: Partial<RecordGroupInput> = {},
): RecordGroupInput => ({
  runId: 'run-1',
  source: DuplicateResolutionSource.SYNC_TIP,
  mode: DuplicateResolutionMode.SYNC,
  normalizedPublicLink: 'doi.org/10.1/abc',
  participants: [
    {
      resultId: 10,
      resultOfficialCode: 5000,
      platformCode: 'TIP',
      indicatorId: 3,
      reportYearId: 2025,
      rawPublicLink: 'https://doi.org/10.1/abc',
      normalizedPublicLink: 'doi.org/10.1/abc',
    },
    {
      resultId: 20,
      resultOfficialCode: 6000,
      platformCode: 'AICCRA',
      indicatorId: 3,
      reportYearId: 2025,
      rawPublicLink: 'https://doi.org/10.1/abc/',
      normalizedPublicLink: 'doi.org/10.1/abc',
    },
  ],
  classification: 'RESOLVED',
  winnerResultId: 10,
  decidingRule: 'RULE_1_TIP',
  decidingResultId: 10,
  hardDeleteEnabled: true,
  plannedOutcomes: [
    { resultId: 10, outcome: DuplicateRowOutcome.WINNER },
    { resultId: 20, outcome: DuplicateRowOutcome.PLANNED },
  ],
  ...overrides,
});

describe('ResultDuplicateResolutionLogService — the pre-delete write', () => {
  it('persists every participant identity before anything is deleted', async () => {
    // Under a hard delete this payload is the ONLY surviving trace of a deleted
    // row. Writing it after the delete would mean a crash between the two
    // destroys both the row and the record of it.
    const { service, repository } = buildService();

    const id = await service.recordGroup(baseInput());

    expect(id).toBe(7);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.participants).toHaveLength(2);
    expect(saved.participants[1]).toMatchObject({
      resultId: 20,
      resultOfficialCode: 6000,
      platformCode: 'AICCRA',
      rawPublicLink: 'https://doi.org/10.1/abc/',
      normalizedPublicLink: 'doi.org/10.1/abc',
    });
    // The planned disposition is on the row too, so a run interrupted before
    // recordOutcomes still shows what it intended to do.
    expect(saved.outcomes).toEqual(baseInput().plannedOutcomes);
    expect(saved.deleted_count).toBe(0);
  });

  it('records the deciding rule and the row that satisfied it', async () => {
    const { service, repository } = buildService();

    await service.recordGroup(baseInput());

    const saved = repository.save.mock.calls[0][0];
    expect(saved.deciding_rule).toBe('RULE_1_TIP');
    expect(saved.deciding_result_id).toBe(10);
    expect(saved.winner_result_id).toBe(10);
  });

  it('records the hard-delete flag state', async () => {
    // The flag's OFF state is "detect and audit, do not delete". Without this a
    // run that planned deletions and performed none is indistinguishable from one
    // that found nothing.
    const { service, repository } = buildService();

    await service.recordGroup(baseInput({ hardDeleteEnabled: false }));

    expect(repository.save.mock.calls[0][0].hard_delete_enabled).toBe(false);
  });

  it('leaves winner and deciding columns NULL for a contradictory group', async () => {
    // UNRESOLVED_CONFLICT has no single winner and no deciding row. R-RES-009 AC.1
    // is satisfied by the classification and reason; forcing a winner would mean
    // inventing one.
    const { service, repository } = buildService();

    await service.recordGroup(
      baseInput({
        classification: 'UNRESOLVED_CONFLICT',
        winnerResultId: undefined,
        decidingRule: undefined,
        decidingResultId: undefined,
        reason:
          'Result 20 would be deleted while it prevails over kept result 10.',
        plannedOutcomes: [
          { resultId: 10, outcome: DuplicateRowOutcome.UNTOUCHED },
          { resultId: 20, outcome: DuplicateRowOutcome.UNTOUCHED },
        ],
      }),
    );

    const saved = repository.save.mock.calls[0][0];
    expect(saved.winner_result_id).toBeNull();
    expect(saved.deciding_rule).toBeNull();
    expect(saved.deciding_result_id).toBeNull();
    expect(saved.classification).toBe('UNRESOLVED_CONFLICT');
    expect(saved.reason).toContain('prevails over kept result');
  });

  it('counts protected rows at plan time', async () => {
    const { service, repository } = buildService();

    await service.recordGroup(
      baseInput({
        plannedOutcomes: [
          { resultId: 10, outcome: DuplicateRowOutcome.WINNER },
          {
            resultId: 20,
            outcome: DuplicateRowOutcome.PROTECTED,
            reason: 'STAR result 900 links to it',
          },
        ],
      }),
    );

    expect(repository.save.mock.calls[0][0].protected_count).toBe(1);
  });

  it('hashes the group key stably and does not index the raw link', async () => {
    const first = ResultDuplicateResolutionLogService.groupKeyHash('doi.org/a');
    const second =
      ResultDuplicateResolutionLogService.groupKeyHash('doi.org/a');
    const other = ResultDuplicateResolutionLogService.groupKeyHash('doi.org/b');

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(first).toHaveLength(64);
  });

  it('generates distinct run ids', () => {
    const a = ResultDuplicateResolutionLogService.newRunId();
    const b = ResultDuplicateResolutionLogService.newRunId();
    expect(a).not.toBe(b);
  });
});

describe('ResultDuplicateResolutionLogService — outcomes cannot be overstated', () => {
  it('derives counts from the outcomes rather than trusting the caller', async () => {
    // A caller cannot report three deletions while listing two.
    const { service, repository } = buildService();

    await service.recordOutcomes(7, [
      { resultId: 20, outcome: DuplicateRowOutcome.DELETED },
      { resultId: 21, outcome: DuplicateRowOutcome.NOOP },
      {
        resultId: 22,
        outcome: DuplicateRowOutcome.FAILED,
        reason: 'errno 1451',
      },
      { resultId: 23, outcome: DuplicateRowOutcome.PROTECTED },
    ]);

    expect(repository.update).toHaveBeenCalledWith(7, {
      outcomes: expect.any(Array),
      deleted_count: 1,
      protected_count: 1,
      failed_count: 1,
      noop_count: 1,
    });
  });

  it('does not count a NOOP as a deletion', async () => {
    const { service, repository } = buildService();

    await service.recordOutcomes(7, [
      { resultId: 20, outcome: DuplicateRowOutcome.NOOP },
      { resultId: 21, outcome: DuplicateRowOutcome.NOOP },
    ]);

    const update = repository.update.mock.calls[0][1];
    expect(update).toMatchObject({ deleted_count: 0, noop_count: 2 });
  });

  it('does not count a PLANNED row as a deletion', async () => {
    // A dry run, or a run with the hard-delete flag off, plans without deleting.
    const { service, repository } = buildService();

    await service.recordOutcomes(7, [
      { resultId: 20, outcome: DuplicateRowOutcome.PLANNED },
    ]);

    expect(repository.update.mock.calls[0][1]).toMatchObject({
      deleted_count: 0,
    });
  });
});

describe('ResultDuplicateResolutionLogService — answering the operator', () => {
  it('summarizes a run from stored data alone', async () => {
    const { service } = buildService([
      {
        classification: 'RESOLVED',
        deleted_count: 2,
        protected_count: 0,
        failed_count: 0,
        noop_count: 0,
      },
      {
        classification: 'RESOLVED',
        deleted_count: 1,
        protected_count: 1,
        failed_count: 0,
        noop_count: 0,
      },
      {
        classification: 'UNRESOLVED_CONFLICT',
        deleted_count: 0,
        protected_count: 0,
        failed_count: 0,
        noop_count: 0,
      },
      {
        classification: 'CROSS_YEAR_REVIEW',
        deleted_count: 0,
        protected_count: 0,
        failed_count: 1,
        noop_count: 1,
      },
    ]);

    const summary = await service.summarizeRun('run-1');

    expect(summary).toEqual({
      runId: 'run-1',
      groups: 4,
      byClassification: {
        RESOLVED: 2,
        UNRESOLVED_CONFLICT: 1,
        CROSS_YEAR_REVIEW: 1,
      },
      deleted: 3,
      protectedRows: 1,
      failed: 1,
      noop: 1,
    });
  });

  it('reports an empty run as zero groups rather than throwing', async () => {
    const { service } = buildService([]);
    const summary = await service.summarizeRun('run-empty');
    expect(summary.groups).toBe(0);
    expect(summary.deleted).toBe(0);
  });

  it('tolerates missing counts on legacy rows', async () => {
    const { service } = buildService([{ classification: 'RESOLVED' }]);
    const summary = await service.summarizeRun('run-1');
    expect(summary.deleted).toBe(0);
    expect(summary.groups).toBe(1);
  });

  it('returns a run in insertion order', async () => {
    const { service, repository } = buildService([]);
    await service.findByRunId('run-1');
    expect(repository.find).toHaveBeenCalledWith({
      where: { run_id: 'run-1' },
      order: { id: 'ASC' },
    });
  });
});

describe('ResultDuplicateResolutionLogService — immediate operator signal', () => {
  it('warns for retained and failed rows, and only debugs a no-op', async () => {
    const { service } = buildService();
    const logger = (
      service as unknown as {
        logger: {
          warn: (message: string) => void;
          debug: (message: string) => void;
        };
      }
    ).logger;
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const debug = jest
      .spyOn(logger, 'debug')
      .mockImplementation(() => undefined);

    service.logNotableOutcomes('run-1', [
      {
        resultId: 20,
        outcome: DuplicateRowOutcome.PROTECTED,
        reason: 'STAR link',
      },
      {
        resultId: 21,
        outcome: DuplicateRowOutcome.FAILED,
        reason: 'errno 1451',
      },
      { resultId: 22, outcome: DuplicateRowOutcome.NOOP },
      { resultId: 23, outcome: DuplicateRowOutcome.DELETED },
    ]);

    // A duplicate that could not be removed is the case a human has to resolve,
    // so it must not be buried at debug level.
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('retained');
    expect(warn.mock.calls[1][0]).toContain('FAILED');
    expect(debug).toHaveBeenCalledTimes(1);
  });

  it('still says something useful when no reason was supplied', async () => {
    const { service } = buildService();
    const logger = (
      service as unknown as { logger: { warn: (message: string) => void } }
    ).logger;
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);

    service.logNotableOutcomes('run-2', [
      { resultId: 30, outcome: DuplicateRowOutcome.PROTECTED },
      { resultId: 31, outcome: DuplicateRowOutcome.FAILED },
    ]);

    expect(warn.mock.calls[0][0]).toContain('must survive');
    expect(warn.mock.calls[1][0]).toContain('unknown error');
  });
});
