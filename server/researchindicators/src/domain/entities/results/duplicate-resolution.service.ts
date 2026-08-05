// @sdd-spec results/cross-platform-duplicate-resolution
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { QueryService } from '../../shared/utils/query.service';
import { StarRelationshipService } from '../../shared/services/star-relationship.service';
import { DuplicateResolutionRunner } from '../../shared/services/duplicate-resolution-runner.service';
import {
  DuplicateCandidate,
  DuplicateCandidateRepository,
} from './repositories/duplicate-candidate.repository';
import {
  DuplicateGroupClassification,
  resolveDuplicateGroup,
} from '../../shared/utils/duplicate-result-priority.util';
import {
  DuplicateResolutionMode,
  DuplicateResolutionSource,
} from './entities/result-duplicate-resolution-log.entity';
import { ResultDuplicateResolutionLogService } from './result-duplicate-resolution-log.service';
import {
  DuplicateResolutionFilterDto,
  DuplicateResolutionPlan,
  DuplicateResolutionPlanGroup,
  DuplicateResolutionStatus,
} from './dto/duplicate-resolution.dto';

/** `app_config` keys this service reads. */
export const SWEEP_LOCK_KEY = 'duplicate_resolution.sweep_lock';
export const PLAN_TTL_MINUTES_KEY = 'duplicate_resolution.plan_ttl_minutes';
const DEFAULT_PLAN_TTL_MINUTES = 30;
const SWEEP_LOCK_TTL_MS = 15 * 60 * 1000;
const GROUP_BATCH_SIZE = 50;

/**
 * The rules path AICCRA has never had.
 *
 * PRMS and TIP reach `results` through sync pipelines that resolve duplicates
 * inline. AICCRA is loaded by a person running a MySQL script, so no code path
 * ever evaluates the rules with an AICCRA row as the incoming result — and the two
 * rules that require AICCRA to displace a stored PRMS/TIP row therefore never
 * execute. **116 cross-platform duplicate groups are waiting for this.**
 *
 * Two endpoints, deliberately separate verbs rather than one `mode` parameter: a
 * `GET` that cannot write is a stronger guarantee than a `POST` that promises not
 * to.
 *
 * `apply` is gated three ways, each covering a different failure:
 *  - **role + auth type** — an unauthorized or non-human caller,
 *  - **digest match** — a plan the operator did not review,
 *  - **TTL** — a plan reviewed too long ago to still describe the data.
 *
 * The digest covers the **fully expanded** deletion set, not loser seed ids.
 * Hashing seeds would let rows created between plan and apply be deleted without
 * ever appearing in the reviewed artifact — and that artifact is the only gate for
 * the one defect class this feature cannot automate.
 */
@Injectable()
export class DuplicateResolutionService {
  private readonly logger = new CgiarLogger(DuplicateResolutionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly candidates: DuplicateCandidateRepository,
    private readonly queryService: QueryService,
    private readonly starRelationships: StarRelationshipService,
    private readonly runner: DuplicateResolutionRunner,
    private readonly auditLog: ResultDuplicateResolutionLogService,
  ) {}

  /**
   * Computes a plan without writing to `results` or any child table.
   *
   * The only write is the audit run row, which is what makes the plan retrievable
   * for the later `apply`.
   */
  async plan(
    filters: DuplicateResolutionFilterDto,
  ): Promise<DuplicateResolutionPlan> {
    const runId = ResultDuplicateResolutionLogService.newRunId();
    const holder = randomUUID();

    await this.acquireLock(holder);
    try {
      const groups = await this.collectGroups(filters);

      for (const group of groups) {
        await this.runner.applyGroup({
          context: {
            runId,
            source: DuplicateResolutionSource.SWEEP,
            mode: DuplicateResolutionMode.DRY_RUN,
          },
          normalizedPublicLink: group.normalizedPublicLink,
          participants: group.participants,
          resolution: group.resolution,
        });
      }

      return this.buildPlan(runId, filters, groups, null);
    } finally {
      await this.releaseLock(holder);
    }
  }

  /**
   * Executes a previously reviewed plan.
   *
   * Re-derives the plan from live data and refuses unless the digest still matches
   * — the data may have moved since the operator looked at it.
   */
  async apply(params: {
    runId: string;
    confirmationDigest: string;
    filters: DuplicateResolutionFilterDto;
  }): Promise<DuplicateResolutionPlan> {
    const reviewed = await this.auditLog.findByRunId(params.runId);
    if (!reviewed.length) {
      throw new BadRequestException(
        `No plan found for run ${params.runId}. Run the plan endpoint first and apply the run id it returns.`,
      );
    }
    if (reviewed[0].mode !== DuplicateResolutionMode.DRY_RUN) {
      throw new BadRequestException(
        `Run ${params.runId} is not a reviewable plan (mode ${reviewed[0].mode}).`,
      );
    }

    const ttlMinutes = await this.readNumberConfig(
      PLAN_TTL_MINUTES_KEY,
      DEFAULT_PLAN_TTL_MINUTES,
    );
    const plannedAt = new Date(reviewed[0].created_at).getTime();
    const ageMinutes = (Date.now() - plannedAt) / 60000;
    if (ageMinutes > ttlMinutes) {
      throw new ConflictException(
        `Plan ${params.runId} was reviewed ${Math.round(ageMinutes)} minutes ago and the limit is ${ttlMinutes}. Re-run the plan endpoint and review it again.`,
      );
    }

    const holder = randomUUID();
    await this.acquireLock(holder);
    try {
      const groups = await this.collectGroups(params.filters);
      const digest = DuplicateResolutionService.digestOf(groups);

      if (digest !== params.confirmationDigest) {
        throw new ConflictException(
          `The data changed since plan ${params.runId} was reviewed. Nothing was deleted. Re-run the plan endpoint and review the new plan.`,
        );
      }

      const applyRunId = ResultDuplicateResolutionLogService.newRunId();
      for (const group of groups) {
        await this.runner.applyGroup({
          context: {
            runId: applyRunId,
            source: DuplicateResolutionSource.SWEEP,
            mode: DuplicateResolutionMode.APPLY,
            confirmationDigest: digest,
          },
          normalizedPublicLink: group.normalizedPublicLink,
          participants: group.participants,
          resolution: group.resolution,
        });
      }

      return this.buildPlan(applyRunId, params.filters, groups, digest);
    } finally {
      await this.releaseLock(holder);
    }
  }

  /**
   * Scans for cross-platform groups, in batches.
   *
   * Batched so the sweep never holds one transaction across the whole run
   * (NFR-RES-002); the per-group transaction lives inside the delete path.
   */
  private async collectGroups(filters: DuplicateResolutionFilterDto): Promise<
    {
      normalizedPublicLink: string;
      participants: DuplicateCandidate[];
      resolution: ReturnType<typeof resolveDuplicateGroup>;
      expandedToDelete: number[];
      refusedLoserIds: number[];
    }[]
  > {
    const keys = await this.candidates.findCrossPlatformGroupKeys({
      reportYearId: filters.reportYear,
      platformCodes: filters.platform,
      indicatorIds: filters.indicator,
      limit: filters.limit,
      offset: filters.limit !== undefined ? 0 : undefined,
    });

    const collected: {
      normalizedPublicLink: string;
      participants: DuplicateCandidate[];
      resolution: ReturnType<typeof resolveDuplicateGroup>;
      expandedToDelete: number[];
      refusedLoserIds: number[];
    }[] = [];

    for (let index = 0; index < keys.length; index += GROUP_BATCH_SIZE) {
      const batch = keys.slice(index, index + GROUP_BATCH_SIZE);
      const members = await this.candidates.findMembersByNormalizedLinks(
        batch.map((key) => key.normalizedPublicLink),
      );

      for (const key of batch) {
        const participants = members.filter(
          (member) => member.normalizedPublicLink === key.normalizedPublicLink,
        );
        // The sweep flags cross-year groups for review rather than resolving them.
        const resolution = resolveDuplicateGroup(participants, {
          flagCrossYear: true,
        });

        const expandedToDelete: number[] = [];
        const refusedLoserIds: number[] = [];
        if (
          resolution.classification === DuplicateGroupClassification.RESOLVED
        ) {
          for (const loser of resolution.losers) {
            if (loser.resultId === null) continue;
            const scope = await this.queryService.resolveResultDeleteScope(
              loser.resultId,
            );
            // A refused identity contributes nothing to the deletion set —
            // its targetIds is already empty — but it must be surfaced
            // separately, not silently absorbed into an all-clear RESOLVED
            // group with an empty toDelete and no explanation.
            if (scope.refusalReason) {
              refusedLoserIds.push(loser.resultId);
              continue;
            }
            const verdict = await this.starRelationships.evaluate(
              scope.targetIds,
            );
            if (!verdict.protectedResultIds.length) {
              expandedToDelete.push(...scope.targetIds);
            }
          }
        }

        collected.push({
          normalizedPublicLink: key.normalizedPublicLink,
          participants,
          resolution,
          expandedToDelete,
          refusedLoserIds,
        });
      }
    }

    return collected;
  }

  private buildPlan(
    runId: string,
    filters: DuplicateResolutionFilterDto,
    groups: {
      normalizedPublicLink: string;
      participants: DuplicateCandidate[];
      resolution: ReturnType<typeof resolveDuplicateGroup>;
      expandedToDelete: number[];
      refusedLoserIds: number[];
    }[],
    appliedDigest: string | null,
  ): DuplicateResolutionPlan {
    const planGroups: DuplicateResolutionPlanGroup[] = groups.map((group) => ({
      groupKey: group.normalizedPublicLink,
      classification: group.resolution.classification,
      rule: group.resolution.rule,
      winnerResultId: group.resolution.winner?.resultId ?? null,
      decidedBy: group.resolution.decidedBy,
      participantResultIds: group.participants.map(
        (participant) => participant.resultId,
      ),
      toDelete: group.expandedToDelete,
      // Surfaced separately from toDelete so the plan and the audit row
      // agree with what apply will actually do: a refused loser is not
      // deleted, but a RESOLVED group with an empty toDelete and no `refused`
      // entry reads as "nothing to do" rather than "needs manual handling".
      refused: group.refusedLoserIds,
      reason: group.resolution.reason ?? null,
    }));

    const byClassification: Record<string, number> = {};
    for (const group of planGroups) {
      byClassification[group.classification] =
        (byClassification[group.classification] ?? 0) + 1;
    }

    const rowsToDelete = planGroups.reduce(
      (total, group) => total + group.toDelete.length,
      0,
    );

    // A run that found nothing has not proved nothing is there: the filter may be
    // wrong, or the scan may be looking in the wrong place. Reporting a bare
    // success would be indistinguishable from a working, empty database.
    const status = groups.length
      ? DuplicateResolutionStatus.OK
      : DuplicateResolutionStatus.INCONCLUSIVE;

    return {
      runId,
      status,
      confirmationDigest:
        appliedDigest ?? DuplicateResolutionService.digestOf(groups),
      filters,
      groupCount: groups.length,
      rowsToDelete,
      byClassification,
      groups: planGroups,
      message:
        status === DuplicateResolutionStatus.INCONCLUSIVE
          ? 'No cross-platform duplicate groups matched this filter. That is not proof there are none — check the filter before concluding the data is clean.'
          : undefined,
    };
  }

  /**
   * Digest over the ordered, fully expanded deletion set.
   *
   * Seed ids alone would let a row created between plan and apply be deleted
   * without appearing in the artifact the operator reviewed.
   */
  static digestOf(
    groups: { normalizedPublicLink: string; expandedToDelete: number[] }[],
  ): string {
    const canonical = [...groups]
      .sort((left, right) =>
        left.normalizedPublicLink.localeCompare(right.normalizedPublicLink),
      )
      .map(
        (group) =>
          `${group.normalizedPublicLink}:${[...group.expandedToDelete].sort((a, b) => a - b).join(',')}`,
      )
      .join('|');
    return createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Acquires the run lock with a single conditional UPDATE.
   *
   * Atomic by construction: MySQL evaluates the predicate and the write together,
   * so two instances cannot both see "free". An in-process boolean would pass a
   * unit test and fail the moment a second replica runs.
   */
  private async acquireLock(holder: string): Promise<void> {
    const now = Date.now();
    const value = `${holder}|${now + SWEEP_LOCK_TTL_MS}`;
    const result = await this.dataSource.query(
      `UPDATE app_config
          SET simple_value = ?
        WHERE \`key\` = ?
          AND (simple_value IS NULL
               OR simple_value = ''
               OR CAST(SUBSTRING_INDEX(simple_value, '|', -1) AS UNSIGNED) < ?)`,
      [value, SWEEP_LOCK_KEY, now],
    );

    if (!Number(result?.affectedRows ?? 0)) {
      throw new ConflictException(
        'A duplicate-resolution sweep is already running. Wait for it to finish before starting another.',
      );
    }
  }

  /** Releases the lock only if this holder still owns it. */
  private async releaseLock(holder: string): Promise<void> {
    await this.dataSource
      .query(
        `UPDATE app_config
            SET simple_value = ''
          WHERE \`key\` = ?
            AND SUBSTRING_INDEX(simple_value, '|', 1) = ?`,
        [SWEEP_LOCK_KEY, holder],
      )
      .catch((error: Error) =>
        this.logger.warn(
          `Could not release the sweep lock: ${error.message}. It expires on its own in ${SWEEP_LOCK_TTL_MS / 60000} minutes.`,
        ),
      );
  }

  private async readNumberConfig(
    key: string,
    fallback: number,
  ): Promise<number> {
    try {
      const rows: Record<string, unknown>[] = await this.dataSource.query(
        `SELECT simple_value AS value FROM app_config WHERE \`key\` = ? LIMIT 1`,
        [key],
      );
      const parsed = Number(rows?.[0]?.value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
}
