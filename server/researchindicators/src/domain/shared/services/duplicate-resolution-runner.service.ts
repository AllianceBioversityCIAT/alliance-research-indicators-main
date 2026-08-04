// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CgiarLogger } from '../utils/cgiar-logs/logs.util';
import { QueryService, ResultDeleteStatus } from '../utils/query.service';
import { StarRelationshipService } from './star-relationship.service';
import {
  DuplicateGroupClassification,
  DuplicateGroupParticipant,
  DuplicateGroupResolution,
} from '../utils/duplicate-result-priority.util';
import {
  DuplicateParticipantSnapshot,
  DuplicateResolutionMode,
  DuplicateResolutionSource,
  DuplicateRowOutcome,
  DuplicateRowOutcomeRecord,
} from '../../entities/results/entities/result-duplicate-resolution-log.entity';
import { ResultDuplicateResolutionLogService } from '../../entities/results/result-duplicate-resolution-log.service';
import { OpenSearchResultApi } from '../../tools/open-search/results/result.opensearch.api';
import { ElasticOperationEnum } from '../../tools/open-search/dto/elastic-operation.dto';

/** `app_config` key gating destructive execution. */
export const HARD_DELETE_ENABLED_KEY =
  'duplicate_resolution.hard_delete_enabled';

export type ResolutionRunContext = {
  runId: string;
  source: DuplicateResolutionSource;
  mode: DuplicateResolutionMode;
  confirmationDigest?: string | null;
};

export type ApplyGroupInput = {
  context: ResolutionRunContext;
  normalizedPublicLink: string;
  /** Every participant, in the same shape the resolver consumed. */
  participants: (DuplicateGroupParticipant & {
    resultOfficialCode?: number | null;
    rawPublicLink?: string | null;
    normalizedPublicLink?: string | null;
  })[];
  resolution: DuplicateGroupResolution;
};

export type ApplyGroupReport = {
  auditRecordId: number | null;
  outcomes: DuplicateRowOutcomeRecord[];
  deleted: number;
  protectedRows: number;
  failed: number;
  hardDeleteEnabled: boolean;
};

/**
 * The single loser loop.
 *
 * Every deletion in this feature goes through here — the sync path and the admin
 * sweep both call it, so there is one place where a row can be destroyed and one
 * place where the order guard → audit → delete is enforced. An earlier revision
 * had the sync path issue a direct delete alongside the loop, which produced two
 * audit rows for one physical deletion and let one call site skip the guard.
 *
 * The order is not incidental:
 *
 *  1. **Guard first**, over the whole expanded family, not the loser's seed row.
 *  2. **Audit second**, before anything is removed. Under a hard delete the
 *     participant payload is the only surviving trace, so a crash between delete
 *     and audit would otherwise destroy both the row and the record of it.
 *  3. **Delete third**, one error boundary per loser. A failure records `FAILED`
 *     and the loop continues; it is never rethrown, because the caller's `catch`
 *     rolls back the winner and a cleanup failure must not destroy the row the
 *     cleanup was protecting.
 *
 * The two config flags default in opposite directions, and both toward safety:
 * `hard_delete_enabled` defaults **false** (delete nothing), while the STAR
 * guard's inactive-link flag defaults **true** (protect more).
 */
@Injectable()
export class DuplicateResolutionRunner {
  private readonly logger = new CgiarLogger(DuplicateResolutionRunner.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly queryService: QueryService,
    private readonly starRelationships: StarRelationshipService,
    private readonly auditLog: ResultDuplicateResolutionLogService,
    private readonly openSearchResults: OpenSearchResultApi,
  ) {}

  /**
   * Records the plan and, when permitted, executes it.
   *
   * Never throws for a single row: a per-loser failure becomes a `FAILED` outcome.
   */
  async applyGroup(input: ApplyGroupInput): Promise<ApplyGroupReport> {
    const { context, resolution } = input;
    const hardDeleteEnabled =
      context.mode === DuplicateResolutionMode.DRY_RUN
        ? false
        : await this.isHardDeleteEnabled();

    const snapshots = input.participants.map((participant) =>
      DuplicateResolutionRunner.toSnapshot(
        participant,
        input.normalizedPublicLink,
      ),
    );

    // --- 1. Guard, over each loser's fully expanded family ------------------
    const plans: {
      loser: DuplicateGroupParticipant;
      targetIds: number[];
      siblingIdsOutsideReportYear: number[];
      protectedIds: number[];
      protectingRelationships: unknown[];
    }[] = [];

    for (const loser of resolution.losers) {
      if (loser.resultId === null) continue; // a prospective row: nothing stored yet
      const scope = await this.queryService.resolveResultDeleteScope(
        loser.resultId,
      );
      const verdict = await this.starRelationships.evaluate(scope.targetIds);
      plans.push({
        loser,
        targetIds: scope.targetIds,
        siblingIdsOutsideReportYear: scope.siblingIdsOutsideReportYear,
        protectedIds: verdict.protectedResultIds,
        protectingRelationships: verdict.relationships,
      });
    }

    const plannedOutcomes: DuplicateRowOutcomeRecord[] = [
      ...resolution.untouched
        .filter((row) => row.resultId !== resolution.winner?.resultId)
        .map((row) => ({
          resultId: row.resultId,
          outcome: DuplicateRowOutcome.UNTOUCHED,
        })),
      ...(resolution.winner
        ? [
            {
              resultId: resolution.winner.resultId,
              outcome: DuplicateRowOutcome.WINNER,
            },
          ]
        : []),
      ...resolution.losers
        .filter((loser) => loser.resultId === null)
        .map((loser) => ({
          resultId: loser.resultId,
          outcome: DuplicateRowOutcome.OMITTED,
        })),
      ...plans.map((plan) => ({
        resultId: plan.loser.resultId,
        outcome: plan.protectedIds.length
          ? DuplicateRowOutcome.PROTECTED
          : DuplicateRowOutcome.PLANNED,
        reason: plan.protectedIds.length
          ? `Retained: result(s) ${plan.protectedIds.join(', ')} are referenced by something that must survive.`
          : undefined,
        protectingRelationships: plan.protectedIds.length
          ? plan.protectingRelationships
          : undefined,
        expandedResultIds: plan.targetIds,
        siblingIdsOutsideReportYear: plan.siblingIdsOutsideReportYear.length
          ? plan.siblingIdsOutsideReportYear
          : undefined,
      })),
    ];

    // --- 2. Audit, before anything is removed -------------------------------
    const auditRecordId = await this.auditLog.recordGroup({
      runId: context.runId,
      source: context.source,
      mode: context.mode,
      normalizedPublicLink: input.normalizedPublicLink,
      participants: snapshots,
      classification: resolution.classification,
      winnerResultId: resolution.winner?.resultId ?? null,
      decidingRule: resolution.rule,
      decidingResultId: resolution.decidedBy,
      hardDeleteEnabled,
      confirmationDigest: context.confirmationDigest ?? null,
      reason: resolution.reason ?? null,
      plannedOutcomes,
    });

    // --- 3. Delete, one error boundary per loser ---------------------------
    const finalOutcomes = [...plannedOutcomes];
    if (
      hardDeleteEnabled &&
      resolution.classification === DuplicateGroupClassification.RESOLVED
    ) {
      for (const plan of plans) {
        if (plan.protectedIds.length) continue;
        const index = finalOutcomes.findIndex(
          (outcome) =>
            outcome.resultId === plan.loser.resultId &&
            outcome.outcome === DuplicateRowOutcome.PLANNED,
        );
        try {
          const results = await this.queryService.deleteFullResultById(
            plan.loser.resultId as number,
          );
          const anyDeleted = results.some(
            (outcome) => outcome.status === ResultDeleteStatus.DELETED,
          );
          if (anyDeleted) {
            await this.removeFromSearchIndex(plan.targetIds);
          }
          finalOutcomes[index] = {
            ...finalOutcomes[index],
            outcome: anyDeleted
              ? DuplicateRowOutcome.DELETED
              : DuplicateRowOutcome.NOOP,
          };
        } catch (error) {
          // Never rethrown. The caller's catch rolls back the winner, and a
          // cleanup failure must not destroy the row the cleanup protected.
          finalOutcomes[index] = {
            ...finalOutcomes[index],
            outcome: DuplicateRowOutcome.FAILED,
            reason: (error as Error).message ?? 'Unknown deletion error',
          };
        }
      }
      await this.auditLog.recordOutcomes(auditRecordId, finalOutcomes);
    }

    this.auditLog.logNotableOutcomes(context.runId, finalOutcomes);

    return {
      auditRecordId,
      outcomes: finalOutcomes,
      deleted: DuplicateResolutionRunner.countOf(
        finalOutcomes,
        DuplicateRowOutcome.DELETED,
      ),
      protectedRows: DuplicateResolutionRunner.countOf(
        finalOutcomes,
        DuplicateRowOutcome.PROTECTED,
      ),
      failed: DuplicateResolutionRunner.countOf(
        finalOutcomes,
        DuplicateRowOutcome.FAILED,
      ),
      hardDeleteEnabled,
    };
  }

  /**
   * Whether destructive execution is permitted.
   *
   * Defaults to **false**: a missing or unreadable config never enables deletion.
   * When off the runner still resolves, guards and audits — "detect and report,
   * do not delete" — and deliberately does NOT fall back to a soft delete, because
   * the soft delete is the reported bug.
   */
  async isHardDeleteEnabled(): Promise<boolean> {
    try {
      const rows: Record<string, unknown>[] = await this.dataSource.query(
        `SELECT simple_value AS value FROM app_config WHERE \`key\` = ? LIMIT 1`,
        [HARD_DELETE_ENABLED_KEY],
      );
      const raw = rows?.[0]?.value;
      if (raw === undefined || raw === null) return false;
      return String(raw).trim().toLowerCase() === 'true';
    } catch {
      this.logger.warn(
        `Could not read ${HARD_DELETE_ENABLED_KEY}; hard deletion stays disabled.`,
      );
      return false;
    }
  }

  /**
   * Removes deleted results from the search index.
   *
   * Without this the search surface keeps returning a `result_id` that no longer
   * exists — a phantom worse than the duplicate it replaced. A failure here is
   * logged and does NOT change the row's outcome: the database is the system of
   * record, and a stale index is repaired by a reindex, so reporting the deletion
   * as failed would be the wrong signal.
   */
  private async removeFromSearchIndex(resultIds: number[]): Promise<void> {
    for (const resultId of resultIds) {
      try {
        await this.openSearchResults.uploadSingleToOpenSearch(
          { result_id: resultId } as never,
          ElasticOperationEnum.DELETE,
        );
      } catch (error) {
        this.logger.warn(
          `Result ${resultId} was deleted but could not be removed from the search index: ${(error as Error).message}. A reindex will repair it.`,
        );
      }
    }
  }

  private static toSnapshot(
    participant: DuplicateGroupParticipant & {
      resultOfficialCode?: number | null;
      rawPublicLink?: string | null;
      normalizedPublicLink?: string | null;
    },
    fallbackNormalizedLink: string,
  ): DuplicateParticipantSnapshot {
    return {
      resultId: participant.resultId,
      resultOfficialCode: participant.resultOfficialCode ?? null,
      platformCode: String(participant.platformCode),
      indicatorId: participant.indicatorId ?? null,
      reportYearId: participant.reportYearId ?? null,
      rawPublicLink: participant.rawPublicLink ?? null,
      normalizedPublicLink:
        participant.normalizedPublicLink ?? fallbackNormalizedLink,
    };
  }

  private static countOf(
    outcomes: DuplicateRowOutcomeRecord[],
    outcome: DuplicateRowOutcome,
  ): number {
    return outcomes.filter((entry) => entry.outcome === outcome).length;
  }
}
