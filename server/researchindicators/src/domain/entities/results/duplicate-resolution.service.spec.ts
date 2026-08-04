/**
 * Two limits are stated up front so a green run is not read as more than it is.
 *
 *  - **"The dry run mutates nothing" is not proven here.** The done criterion asks
 *    for row counts before and after, which needs a database. What these tests
 *    prove is that `plan()` drives the runner with `mode: DRY_RUN`; that this mode
 *    performs no delete is proven in the runner's own suite. T-11 closes the chain
 *    with real counts.
 *  - **Lock concurrency is tested against a model of the SQL, not the SQL.** The
 *    fake `app_config` below reproduces the conditional `UPDATE` semantics —
 *    exactly one of two simultaneous acquirers gets `affectedRows: 1`. That makes
 *    the *service* provably correct under contention, but the model's fidelity to
 *    MySQL is itself an assumption (KZ-001: a double that does not behave like the
 *    thing it stands for yields a green suite over broken behavior). T-11 confirms
 *    it against a real server.
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportingPlatformEnum } from './enum/reporting-platform.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { DuplicateResolutionMode } from './entities/result-duplicate-resolution-log.entity';
import {
  DuplicateResolutionService,
  SWEEP_LOCK_KEY,
} from './duplicate-resolution.service';
import { DuplicateResolutionStatus } from './dto/duplicate-resolution.dto';

type Options = {
  groups?: { key: string; members: Record<string, unknown>[] }[];
  reviewedRun?: Record<string, unknown>[];
  ttlMinutes?: string;
  protectedIds?: number[];
};

const member = (
  resultId: number,
  platformCode: ReportingPlatformEnum,
  indicatorId: IndicatorsEnum,
  normalizedPublicLink: string,
  reportYearId = 2024,
) => ({
  resultId,
  resultOfficialCode: resultId * 10,
  platformCode,
  indicatorId,
  reportYearId,
  rawPublicLink: `https://${normalizedPublicLink}`,
  normalizedPublicLink,
});

const build = (options: Options = {}) => {
  const groups = options.groups ?? [];

  // Models the conditional UPDATE: whoever writes first while the row is free
  // gets affectedRows 1; a second acquirer sees a non-expired holder and gets 0.
  const config: Record<string, string> = {
    [SWEEP_LOCK_KEY]: '',
    'duplicate_resolution.plan_ttl_minutes': options.ttlMinutes ?? '30',
  };

  const dataSource = {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('SET simple_value = ?')) {
        const [value, key, now] = params as [string, string, number];
        const current = config[key];
        const expiry = current ? Number(current.split('|')[1]) : 0;
        if (!current || expiry < now) {
          config[key] = value;
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }
      if (sql.includes("SET simple_value = ''")) {
        const [key, holder] = params as [string, string];
        if (config[key]?.split('|')[0] === holder) config[key] = '';
        return { affectedRows: 1 };
      }
      if (sql.includes('SELECT simple_value')) {
        const [key] = params as [string];
        return [{ value: config[key] }];
      }
      throw new Error(`unexpected query: ${sql}`);
    }),
  } as unknown as DataSource;

  const candidates = {
    findCrossPlatformGroupKeys: jest.fn(async () =>
      groups.map((group) => ({
        normalizedPublicLink: group.key,
        members: group.members.length,
        platforms: 2,
        reportYears: 1,
      })),
    ),
    findMembersByNormalizedLinks: jest.fn(async () =>
      groups.flatMap((group) => group.members),
    ),
  };

  const queryService = {
    resolveResultDeleteScope: jest.fn(async (id: number) => ({
      seedId: id,
      isSnapshot: false,
      reportYearId: 2024,
      targetIds: [id, id + 1],
      siblingIdsOutsideReportYear: [],
    })),
  };

  const starRelationships = {
    evaluate: jest.fn(async () => ({
      protectedResultIds: options.protectedIds ?? [],
      relationships: [],
      inactiveLinkOnlyResultIds: [],
    })),
  };

  const runner = {
    applyGroup: jest.fn(async (_input: Record<string, unknown>) => ({
      auditRecordId: 1,
      outcomes: [],
      deleted: 0,
      protectedRows: 0,
      failed: 0,
      hardDeleteEnabled: true,
    })),
  };

  const auditLog = {
    findByRunId: jest.fn(async () => options.reviewedRun ?? []),
  };

  const service = new DuplicateResolutionService(
    dataSource,
    candidates as never,
    queryService as never,
    starRelationships as never,
    runner as never,
    auditLog as never,
  );

  return { service, runner, candidates, auditLog, dataSource, config };
};

const tipVsAiccra = [
  {
    key: 'doi.org/10.1/a',
    members: [
      member(
        10,
        ReportingPlatformEnum.TIP,
        IndicatorsEnum.KNOWLEDGE_PRODUCT,
        'doi.org/10.1/a',
      ),
      member(
        20,
        ReportingPlatformEnum.AICCRA,
        IndicatorsEnum.INNOVATION_DEV,
        'doi.org/10.1/a',
      ),
    ],
  },
];

describe('DuplicateResolutionService — plan', () => {
  it('drives the runner in DRY_RUN mode for every group', async () => {
    const { service, runner } = build({ groups: tipVsAiccra });

    const plan = await service.plan({});

    expect(runner.applyGroup).toHaveBeenCalledTimes(1);
    expect(runner.applyGroup.mock.calls[0][0]).toMatchObject({
      context: expect.objectContaining({
        mode: DuplicateResolutionMode.DRY_RUN,
      }),
    });
    expect(plan.status).toBe(DuplicateResolutionStatus.OK);
    expect(plan.groupCount).toBe(1);
  });

  it('reports the FULLY EXPANDED deletion set, not loser seed ids', async () => {
    // Hashing seeds alone would let rows created between plan and apply be deleted
    // without ever appearing in the artifact the operator reviewed.
    const { service } = build({ groups: tipVsAiccra });

    const plan = await service.plan({});

    expect(plan.groups[0].winnerResultId).toBe(10);
    expect(plan.groups[0].toDelete).toEqual([20, 21]);
    expect(plan.rowsToDelete).toBe(2);
  });

  it('excludes a protected loser from the deletion set', async () => {
    const { service } = build({ groups: tipVsAiccra, protectedIds: [21] });

    const plan = await service.plan({});

    expect(plan.groups[0].toDelete).toEqual([]);
    expect(plan.rowsToDelete).toBe(0);
  });

  it('reports INCONCLUSIVE, never a bare success, when nothing matched', async () => {
    // A run that found nothing has not proved nothing is there.
    const { service } = build({ groups: [] });

    const plan = await service.plan({});

    expect(plan.status).toBe(DuplicateResolutionStatus.INCONCLUSIVE);
    expect(plan.groupCount).toBe(0);
    expect(plan.message).toContain('not proof');
  });

  it('echoes the filter back so a narrow scan cannot read as full coverage', async () => {
    const { service } = build({ groups: [] });

    const plan = await service.plan({ reportYear: 2024, limit: 5 });

    expect(plan.filters).toEqual({ reportYear: 2024, limit: 5 });
  });

  it('releases the lock even when the scan throws', async () => {
    const { service, candidates, config } = build({ groups: tipVsAiccra });
    candidates.findCrossPlatformGroupKeys.mockRejectedValue(
      new Error('scan failed'),
    );

    await expect(service.plan({})).rejects.toThrow('scan failed');

    expect(config[SWEEP_LOCK_KEY]).toBe('');
  });
});

describe('DuplicateResolutionService — the run lock under contention', () => {
  it('lets exactly one of two simultaneous sweeps proceed', async () => {
    // Two real concurrent calls, not a mocked boolean. The fake app_config
    // reproduces the conditional UPDATE, so only the first acquirer sees the row
    // free. An in-process flag would pass a sequential test and fail here.
    const { service } = build({ groups: tipVsAiccra });

    const [first, second] = await Promise.allSettled([
      service.plan({}),
      service.plan({}),
    ]);

    const outcomes = [first.status, second.status].sort();
    expect(outcomes).toEqual(['fulfilled', 'rejected']);
    const rejected = [first, second].find(
      (settled) => settled.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(rejected.reason.message).toContain('already running');
  });

  it('acquires with a single conditional UPDATE rather than read-then-write', async () => {
    const { service, dataSource } = build({ groups: [] });

    await service.plan({});

    const acquire = (dataSource.query as jest.Mock).mock.calls.find(
      (call) =>
        typeof call[0] === 'string' && call[0].includes('SET simple_value = ?'),
    );
    expect(acquire).toBeDefined();
    expect(acquire![0]).toContain('UPDATE app_config');
    expect(acquire![0]).toContain('OR CAST(SUBSTRING_INDEX');
  });

  it('takes an expired lock rather than deadlocking on a crashed run', async () => {
    const { service, config } = build({ groups: [] });
    config[SWEEP_LOCK_KEY] = `dead-holder|${Date.now() - 1000}`;

    await expect(service.plan({})).resolves.toBeDefined();
  });
});

describe('DuplicateResolutionService — apply is gated three ways', () => {
  const reviewed = (createdAt: Date) => [
    { mode: DuplicateResolutionMode.DRY_RUN, created_at: createdAt },
  ];

  it('refuses with 400 when no plan exists for the run id', async () => {
    const { service, runner } = build({ groups: tipVsAiccra, reviewedRun: [] });

    await expect(
      service.apply({
        runId: 'nope',
        confirmationDigest: 'x'.repeat(64),
        filters: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runner.applyGroup).not.toHaveBeenCalled();
  });

  it('refuses with 400 when the referenced run was not a dry run', async () => {
    const { service, runner } = build({
      groups: tipVsAiccra,
      reviewedRun: [
        { mode: DuplicateResolutionMode.APPLY, created_at: new Date() },
      ],
    });

    await expect(
      service.apply({
        runId: 'r',
        confirmationDigest: 'x'.repeat(64),
        filters: {},
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runner.applyGroup).not.toHaveBeenCalled();
  });

  it('refuses with 409 when the plan is older than the TTL', async () => {
    const { service, runner } = build({
      groups: tipVsAiccra,
      reviewedRun: reviewed(new Date(Date.now() - 60 * 60 * 1000)),
      ttlMinutes: '30',
    });

    await expect(
      service.apply({
        runId: 'r',
        confirmationDigest: 'x'.repeat(64),
        filters: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(runner.applyGroup).not.toHaveBeenCalled();
  });

  it('refuses with 409 and deletes nothing when the digest no longer matches', async () => {
    const { service, runner } = build({
      groups: tipVsAiccra,
      reviewedRun: reviewed(new Date()),
    });

    await expect(
      service.apply({
        runId: 'r',
        confirmationDigest: 'a'.repeat(64),
        filters: {},
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(runner.applyGroup).not.toHaveBeenCalled();
  });

  it('executes in APPLY mode when the digest matches a plan inside the TTL', async () => {
    const { service, runner } = build({
      groups: tipVsAiccra,
      reviewedRun: reviewed(new Date()),
    });
    const plan = await service.plan({});
    runner.applyGroup.mockClear();

    const applied = await service.apply({
      runId: 'r',
      confirmationDigest: plan.confirmationDigest,
      filters: {},
    });

    expect(runner.applyGroup).toHaveBeenCalledTimes(1);
    expect(runner.applyGroup.mock.calls[0][0]).toMatchObject({
      context: expect.objectContaining({
        mode: DuplicateResolutionMode.APPLY,
        confirmationDigest: plan.confirmationDigest,
      }),
    });
    expect(applied.rowsToDelete).toBe(2);
  });

  it('releases the lock after a digest mismatch', async () => {
    const { service, config } = build({
      groups: tipVsAiccra,
      reviewedRun: reviewed(new Date()),
    });

    await expect(
      service.apply({
        runId: 'r',
        confirmationDigest: 'b'.repeat(64),
        filters: {},
      }),
    ).rejects.toThrow();

    expect(config[SWEEP_LOCK_KEY]).toBe('');
  });
});

describe('DuplicateResolutionService.digestOf', () => {
  it('is stable regardless of group or id ordering', () => {
    const a = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'b', expandedToDelete: [2, 1] },
      { normalizedPublicLink: 'a', expandedToDelete: [3] },
    ]);
    const b = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'a', expandedToDelete: [3] },
      { normalizedPublicLink: 'b', expandedToDelete: [1, 2] },
    ]);
    expect(a).toBe(b);
  });

  it('changes when the deletion set changes', () => {
    const before = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'a', expandedToDelete: [1] },
    ]);
    const after = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'a', expandedToDelete: [1, 2] },
    ]);
    expect(before).not.toBe(after);
  });

  it('changes when a group appears', () => {
    const before = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'a', expandedToDelete: [1] },
    ]);
    const after = DuplicateResolutionService.digestOf([
      { normalizedPublicLink: 'a', expandedToDelete: [1] },
      { normalizedPublicLink: 'b', expandedToDelete: [] },
    ]);
    expect(before).not.toBe(after);
  });
});
