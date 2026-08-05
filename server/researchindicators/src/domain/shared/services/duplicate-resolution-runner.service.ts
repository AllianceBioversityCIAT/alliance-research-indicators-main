// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CgiarLogger } from '../utils/cgiar-logs/logs.util';
import {
  QueryService,
  ResultDeleteRefusalReason,
  ResultDeleteStatus,
} from '../utils/query.service';
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
    /** Renamed from `rawPublicLink` (T-15) — a lie on a PRMS participant, whose raw value is an evidence URL, not `public_link`. */
    rawIdentity?: string | null;
    normalizedPublicLink?: string | null;
    /** Which field supplied the identity (R-RES-009 AC.4). */
    identitySource?: string | null;
  })[];
  resolution: DuplicateGroupResolution;
  /**
   * `resultId`s `refuseMultiIdentityLosers` already pulled out of
   * `resolution.losers` and INTO `resolution.untouched`, before this
   * resolution ever reached the runner (R-RES-010 AC.8, design §5.1 step 8).
   *
   * Without this the refusal is unobservable end to end: `resolution.untouched`
   * carries no marker of WHY a row landed there, so every caller that holds
   * the group map (`DuplicateResolutionService.collectGroups`,
   * `SaveResultService.buildDuplicateGroup`) MUST pass the same
   * `refusedResultIds` {@link refuseMultiIdentityLosers} returned them, so the
   * durable audit record can say REFUSED-for-multi-identity rather than a
   * bare UNTOUCHED indistinguishable from a row no rule ever named. Optional
   * only so an as-yet-unmigrated caller does not fail to compile; an absent
   * list means "none refused for this reason", never "don't ask".
   */
  multiIdentityRefusedResultIds?: number[];
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

  /**
   * Shared wording for an {@link ResultDeleteRefusalReason.AMBIGUOUS_LIVE_ROWS}
   * refusal, so the plan-time reason (before anything is deleted) and the
   * apply-time reason (after re-deriving under lock) read identically —
   * an operator comparing the dry-run plan against the audit record should
   * never see two different explanations for the same outcome.
   */
  private static readonly AMBIGUOUS_IDENTITY_REASON =
    'Retained: this identity has more than one live row, so snapshot ownership is undecidable without a parent link. Refused rather than guessed — needs manual handling.';

  /**
   * Wording for a {@link refuseMultiIdentityLosers} refusal (R-RES-010 AC.8,
   * D-dup-20) — distinct from {@link AMBIGUOUS_IDENTITY_REASON} above, which
   * is a DIFFERENT refusal (undecidable snapshot ownership, T-07). Naming the
   * REASON, not just the outcome, is what lets an operator reading the audit
   * table tell "this participant itself resolves to more than one
   * publication" from "no rule ever named this row" — both would otherwise
   * read as the same bare UNTOUCHED.
   */
  private static readonly MULTI_IDENTITY_REASON =
    "Retained: this participant resolves to more than one publication identity, so it is UNRESOLVED_CONFLICT for itself (R-RES-010 AC.8). Refused rather than guessed — the group's other members still resolve normally.";

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

    // Every id `refuseMultiIdentityLosers` already moved into
    // `resolution.untouched` before this resolution reached the runner —
    // named here so the audit record can distinguish them from a row no
    // rule ever named (both currently live in `resolution.untouched`
    // indistinguishably otherwise).
    const multiIdentityRefusedIds = new Set(
      input.multiIdentityRefusedResultIds ?? [],
    );

    // --- 1. Guard, over each loser's fully expanded family ------------------
    const plans: {
      loser: DuplicateGroupParticipant;
      targetIds: number[];
      siblingIdsOutsideReportYear: number[];
      protectedIds: number[];
      protectingRelationships: unknown[];
      refusalReason: ResultDeleteRefusalReason | null;
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
        refusalReason: scope.refusalReason ?? null,
      });
    }

    const plannedOutcomes: DuplicateRowOutcomeRecord[] = [
      ...resolution.untouched
        .filter((row) => row.resultId !== resolution.winner?.resultId)
        .map((row) =>
          row.resultId !== null && multiIdentityRefusedIds.has(row.resultId)
            ? {
                resultId: row.resultId,
                outcome: DuplicateRowOutcome.REFUSED,
                reason: DuplicateResolutionRunner.MULTI_IDENTITY_REASON,
              }
            : {
                resultId: row.resultId,
                outcome: DuplicateRowOutcome.UNTOUCHED,
              },
        ),
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
      ...plans.map((plan) => {
        // A refused identity never reaches the protection check meaningfully
        // (its targetIds is already empty), and it must never be written as
        // PLANNED — this IS the dry-run artifact the DC-5 human gate reads,
        // so a plan that says "will delete" for a row that will always
        // refuse is a defect of the plan, not just of apply.
        if (plan.refusalReason) {
          return {
            resultId: plan.loser.resultId,
            outcome: DuplicateRowOutcome.REFUSED,
            reason: DuplicateResolutionRunner.AMBIGUOUS_IDENTITY_REASON,
            expandedResultIds: plan.targetIds,
            siblingIdsOutsideReportYear: plan.siblingIdsOutsideReportYear.length
              ? plan.siblingIdsOutsideReportYear
              : undefined,
          };
        }
        return {
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
        };
      }),
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
        // A plan already REFUSED at plan time (above) has `targetIds: []` by
        // construction, so the STAR guard never evaluated the family a delete
        // would actually destroy — that family was never passed to
        // `StarRelationshipService`. Attempting the delete anyway would be an
        // unguarded, unaudited "self-heal" the moment the ambiguity clears,
        // which is not "flagged for manual handling" (design.md D-dup-17).
        // Skip it: the plan-time REFUSED outcome survives untouched into
        // `recordOutcomes`, and a cleared ambiguity is picked up by the
        // *next* plan run, where it is scoped, guarded, digested, and
        // reviewed like every other deletion.
        if (plan.refusalReason) continue;
        // Matches PLANNED only — a REFUSED plan is skipped above and never
        // reaches `deleteFullResultById`.
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
          // REFUSED (the identity had more than one live row — T-07 pivot)
          // must never fall through to NOOP: a NOOP means the routine ran and
          // found nothing, a REFUSED means it was never called at all, and
          // the row needs manual handling, not silence.
          const refused = results.some(
            (outcome) => outcome.status === ResultDeleteStatus.REFUSED,
          );
          if (anyDeleted) {
            await this.removeFromSearchIndex(plan.targetIds);
          }
          finalOutcomes[index] = {
            ...finalOutcomes[index],
            outcome: anyDeleted
              ? DuplicateRowOutcome.DELETED
              : refused
                ? DuplicateRowOutcome.REFUSED
                : DuplicateRowOutcome.NOOP,
            reason: refused
              ? DuplicateResolutionRunner.AMBIGUOUS_IDENTITY_REASON
              : finalOutcomes[index].reason,
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
      rawIdentity?: string | null;
      normalizedPublicLink?: string | null;
      identitySource?: string | null;
    },
    fallbackNormalizedLink: string,
  ): DuplicateParticipantSnapshot {
    return {
      resultId: participant.resultId,
      resultOfficialCode: participant.resultOfficialCode ?? null,
      platformCode: String(participant.platformCode),
      indicatorId: participant.indicatorId ?? null,
      reportYearId: participant.reportYearId ?? null,
      // `DuplicateParticipantSnapshot.rawPublicLink` keeps its historical
      // field name (unlike the repository's `DuplicateCandidate`, which
      // renamed it to `rawIdentity` — see that type's doc) so this audit
      // JSON shape does not change under already-written rows; only the
      // SOURCE it is populated from changes.
      rawPublicLink: participant.rawIdentity ?? null,
      normalizedPublicLink:
        participant.normalizedPublicLink ?? fallbackNormalizedLink,
      identitySource: participant.identitySource ?? null,
    };
  }

  private static countOf(
    outcomes: DuplicateRowOutcomeRecord[],
    outcome: DuplicateRowOutcome,
  ): number {
    return outcomes.filter((entry) => entry.outcome === outcome).length;
  }
}
