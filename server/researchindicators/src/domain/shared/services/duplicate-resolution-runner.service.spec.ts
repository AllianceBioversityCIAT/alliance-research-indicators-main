import { DataSource } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import {
  ResultDeleteRefusalReason,
  ResultDeleteStatus,
} from '../utils/query.service';
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
import { PublicationIdentitySource } from '../utils/publication-identity.util';

const order: string[] = [];

const build = (options: {
  hardDelete?: string | null;
  configThrows?: boolean;
  protectedIds?: number[];
  deleteStatus?: ResultDeleteStatus;
  deleteThrows?: boolean;
  openSearchThrows?: boolean;
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
      refusalReason: null,
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

  const openSearchResults = {
    uploadSingleToOpenSearch: jest.fn(async () => {
      order.push('opensearch');
      if (options.openSearchThrows) throw new Error('index unavailable');
      return undefined;
    }),
  };

  const runner = new DuplicateResolutionRunner(
    dataSource,
    queryService as never,
    starRelationships as never,
    auditLog as never,
    openSearchResults as never,
  );
  return {
    runner,
    queryService,
    starRelationships,
    auditLog,
    dataSource,
    openSearchResults,
  };
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
  rawIdentity: 'https://example.org/doc',
  normalizedPublicLink: 'example.org/doc',
  identitySource:
    platformCode === ReportingPlatformEnum.PRMS
      ? PublicationIdentitySource.HANDLE_EVIDENCE
      : PublicationIdentitySource.PUBLIC_LINK,
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

    expect(order).toEqual([
      'guard',
      'audit',
      'delete',
      'opensearch',
      'opensearch',
    ]);
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

  it("names each participant's identity source in the audit snapshot (R-RES-009 AC.4)", async () => {
    // Under a hard delete this is the only way to reconstruct WHY a row was
    // considered a member of its group. The field is renamed on the input
    // (`rawIdentity`, T-15 — `rawPublicLink` would be a lie on a PRMS
    // participant) but keeps its historical name on the OUTPUT snapshot.
    const { runner, auditLog } = build({});

    await runner.applyGroup(input());

    const snapshots = (auditLog.recordGroup.mock.calls[0][0] as any)
      .participants;
    const loserSnapshot = snapshots.find((p: any) => p.resultId === 20);
    expect(loserSnapshot).toMatchObject({
      rawPublicLink: 'https://example.org/doc',
      identitySource: PublicationIdentitySource.HANDLE_EVIDENCE,
    });
    const winnerSnapshot = snapshots.find((p: any) => p.resultId === 10);
    expect(winnerSnapshot).toMatchObject({
      identitySource: PublicationIdentitySource.PUBLIC_LINK,
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

  it('records REFUSED, never NOOP, when the identity has more than one live row (T-07 pivot)', async () => {
    // QueryService refuses rather than guesses when a snapshot's owning live
    // row is undecidable. That refusal must not fall through to the generic
    // "nothing deleted" NOOP branch — it needs manual handling, not silence.
    const { runner } = build({ deleteStatus: ResultDeleteStatus.REFUSED });

    const report = await runner.applyGroup(input());

    expect(report.deleted).toBe(0);
    const outcome = report.outcomes.find((e) => e.resultId === 20);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(outcome?.outcome).not.toBe(DuplicateRowOutcome.NOOP);
    expect(outcome?.reason).toContain('more than one live row');
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

describe('DuplicateResolutionRunner — a multi-identity refusal is observable, not a bare UNTOUCHED', () => {
  // Reviewer FAIL (attempt 2): `refuseMultiIdentityLosers` already moved the
  // ambiguous participant into `resolution.untouched` before this resolution
  // ever reaches the runner, so — without `multiIdentityRefusedResultIds` —
  // the runner cannot tell it apart from a row no rule ever named. This is
  // the tripwire's OBSERVABILITY: proving the outcome and reason actually
  // land in the durable audit record, not just that a number was computed
  // somewhere upstream.
  const refusedParticipant = participant(
    30,
    ReportingPlatformEnum.PRMS,
    IndicatorsEnum.KNOWLEDGE_PRODUCT,
  );

  const groupWithMultiIdentityRefusal = {
    ...resolvedGroup,
    untouched: [winner, refusedParticipant],
  };

  it('tags the refused participant REFUSED with the multi-identity reason, in the plan outcomes AND in the report', async () => {
    const { runner } = build({});

    const report = await runner.applyGroup({
      ...input(groupWithMultiIdentityRefusal),
      multiIdentityRefusedResultIds: [30],
    });

    const outcome = report.outcomes.find((entry) => entry.resultId === 30);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(outcome?.reason).toContain('more than one publication identity');
    // Never conflated with the OTHER refusal reason (T-07's undecidable
    // snapshot ownership) — an operator reading the table must be able to
    // tell the two apart.
    expect(outcome?.reason).not.toContain('live row');
  });

  it("writes the REFUSED entry into recordGroup's plannedOutcomes — the durable trace, not just the in-memory report", async () => {
    const { runner, auditLog } = build({});

    await runner.applyGroup({
      ...input(groupWithMultiIdentityRefusal),
      multiIdentityRefusedResultIds: [30],
    });

    const plannedOutcomes = auditLog.recordGroup.mock.calls[0][0]
      .plannedOutcomes as { resultId: number; outcome: string }[];
    const entry = plannedOutcomes.find((o) => o.resultId === 30);
    expect(entry?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(
      plannedOutcomes.some(
        (o) => o.resultId === 30 && o.outcome === DuplicateRowOutcome.UNTOUCHED,
      ),
    ).toBe(false);
  });

  it('never attempts a delete for a multi-identity-refused participant even with hard delete on', async () => {
    const { runner, queryService } = build({ hardDelete: 'true' });

    await runner.applyGroup({
      ...input(groupWithMultiIdentityRefusal),
      multiIdentityRefusedResultIds: [30],
    });

    expect(queryService.resolveResultDeleteScope).not.toHaveBeenCalledWith(30);
    expect(queryService.deleteFullResultById).not.toHaveBeenCalledWith(30);
  });

  it('falls back to a bare UNTOUCHED when the caller passes no multiIdentityRefusedResultIds (backward compatible)', async () => {
    const { runner } = build({});

    const report = await runner.applyGroup(
      input(groupWithMultiIdentityRefusal),
    );

    const outcome = report.outcomes.find((entry) => entry.resultId === 30);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.UNTOUCHED);
  });
});

describe('DuplicateResolutionRunner — an ambiguous identity is REFUSED at plan time, not silently PLANNED', () => {
  // Reviewer FAIL (attempt 1), issue 2: `scope.refusalReason` was discarded by
  // both the plan-building loop and the delete-execution loop, so a refused
  // loser was written to the audit table as PLANNED with an empty
  // `expandedResultIds` — the dry-run artifact IS the DC-5 human gate, so
  // this is a defect of the plan itself, not only of what apply would do.
  const refusedScope = {
    seedId: 20,
    isSnapshot: false,
    reportYearId: 2024,
    targetIds: [] as number[],
    siblingIdsOutsideReportYear: [21],
    refusalReason: ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS,
  };

  it('marks the plan outcome REFUSED, even in DRY_RUN where the delete step never runs', async () => {
    const { runner, queryService } = build({});
    queryService.resolveResultDeleteScope.mockResolvedValueOnce(refusedScope);

    const report = await runner.applyGroup({
      ...input(),
      context: {
        runId: 'run-1',
        source: DuplicateResolutionSource.SWEEP,
        mode: DuplicateResolutionMode.DRY_RUN,
      },
    });

    const outcome = report.outcomes.find((entry) => entry.resultId === 20);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(outcome?.reason).toContain('manual handling');
    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
  });

  it('writes REFUSED — never PLANNED — into the audit record before anything is deleted', async () => {
    const { runner, auditLog, queryService } = build({});
    queryService.resolveResultDeleteScope.mockResolvedValueOnce(refusedScope);

    await runner.applyGroup(input());

    const plannedOutcomes = auditLog.recordGroup.mock.calls[0][0]
      .plannedOutcomes as { resultId: number; outcome: string }[];
    const entry = plannedOutcomes.find((o) => o.resultId === 20);
    expect(entry?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(
      plannedOutcomes.some((o) => o.outcome === DuplicateRowOutcome.PLANNED),
    ).toBe(false);
  });

  it('never attempts the delete at apply time for a refused plan, and stays REFUSED', async () => {
    // Reviewer FAIL (attempt 2): a "self-heal" re-attempt for an already
    // REFUSED plan deleted a family the STAR guard never evaluated (its
    // targetIds is `[]` by construction), that the audit record did not
    // list, and that OpenSearch was never told about. The apply loop must
    // skip a REFUSED plan entirely — the plan-time REFUSED outcome survives
    // untouched into `recordOutcomes`, and a cleared ambiguity is picked up
    // by the *next* plan run, where it is scoped, guarded, digested, and
    // reviewed like every other deletion.
    const { runner, queryService, auditLog } = build({ hardDelete: 'true' });
    queryService.resolveResultDeleteScope.mockResolvedValueOnce(refusedScope);

    const report = await runner.applyGroup(input());

    expect(queryService.deleteFullResultById).not.toHaveBeenCalled();
    const outcome = report.outcomes.find((entry) => entry.resultId === 20);
    expect(outcome?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(outcome?.reason).toContain('manual handling');
    expect(report.deleted).toBe(0);

    // The audit record (`recordOutcomes`, called after the apply loop) must
    // carry the same REFUSED entry through untouched — never NOOP (which
    // would mean the routine ran and found nothing) and never DELETED.
    const recordedOutcomes = (auditLog.recordOutcomes as jest.Mock).mock
      .calls[0][1] as {
      resultId: number;
      outcome: string;
    }[];
    const recordedEntry = recordedOutcomes.find((o) => o.resultId === 20);
    expect(recordedEntry?.outcome).toBe(DuplicateRowOutcome.REFUSED);
    expect(
      recordedOutcomes.some((o) => o.outcome === DuplicateRowOutcome.NOOP),
    ).toBe(false);
    expect(
      recordedOutcomes.some((o) => o.outcome === DuplicateRowOutcome.DELETED),
    ).toBe(false);
  });
});

describe('DuplicateResolutionRunner — search index removal', () => {
  it('removes every deleted family member from the index', async () => {
    // Otherwise search keeps returning a result_id that no longer exists — a
    // phantom worse than the duplicate it replaced.
    const { runner, openSearchResults } = build({});

    await runner.applyGroup(input());

    expect(openSearchResults.uploadSingleToOpenSearch).toHaveBeenCalledTimes(2);
  });

  it('does not touch the index when nothing was deleted', async () => {
    const { runner, openSearchResults } = build({ hardDelete: 'false' });
    await runner.applyGroup(input());
    expect(openSearchResults.uploadSingleToOpenSearch).not.toHaveBeenCalled();
  });

  it('still reports the row DELETED when index removal fails', async () => {
    // The database is the system of record; a stale index is repaired by a
    // reindex. Reporting the deletion as failed would be the wrong signal.
    const { runner } = build({ openSearchThrows: true });

    const report = await runner.applyGroup(input());

    expect(report.deleted).toBe(1);
    expect(report.failed).toBe(0);
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
