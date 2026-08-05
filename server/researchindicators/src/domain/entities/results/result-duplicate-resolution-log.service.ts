// @sdd-spec results/cross-platform-duplicate-resolution
import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import {
  DuplicateParticipantSnapshot,
  DuplicateResolutionMode,
  DuplicateResolutionSource,
  DuplicateRowOutcome,
  DuplicateRowOutcomeRecord,
  ResultDuplicateResolutionLog,
} from './entities/result-duplicate-resolution-log.entity';

export type RecordGroupInput = {
  runId: string;
  source: DuplicateResolutionSource;
  mode: DuplicateResolutionMode;
  normalizedPublicLink: string;
  participants: DuplicateParticipantSnapshot[];
  classification: string;
  winnerResultId?: number | null;
  decidingRule?: string | null;
  decidingResultId?: number | null;
  hardDeleteEnabled: boolean;
  confirmationDigest?: string | null;
  reason?: string | null;
  /** The planned per-row disposition, written before anything is deleted. */
  plannedOutcomes: DuplicateRowOutcomeRecord[];
};

export type RunSummary = {
  runId: string;
  groups: number;
  byClassification: Record<string, number>;
  deleted: number;
  protectedRows: number;
  failed: number;
  noop: number;
  /**
   * Derived from each record's `outcomes` JSON at read time — there is no
   * `refused_count` column, and this needs none: unlike the other four
   * counts, `REFUSED` was introduced (T-07 pivot) after those columns were
   * added, and it would be the fifth migration for one boolean-shaped fact
   * a JSON scan already answers. Without this, a refusal sat in `outcomes`
   * but in none of the counts, and the counts stopped summing to the group's
   * participant total — a false "everything is accounted for".
   */
  refused: number;
};

/**
 * Sole writer of `result_duplicate_resolution_log`.
 *
 * The write order is the point. {@link recordGroup} persists the participant
 * identities and the planned disposition **before** any deletion is attempted;
 * {@link recordOutcomes} then updates the same row with what actually happened.
 * Under a hard delete the pre-write is the only surviving trace of a deleted row,
 * so writing it afterwards would mean that a crash between delete and audit
 * destroys both the row and the record of it.
 */
@Injectable()
export class ResultDuplicateResolutionLogService {
  private readonly logger = new CgiarLogger(
    ResultDuplicateResolutionLogService.name,
  );
  private readonly repository: Repository<ResultDuplicateResolutionLog>;

  constructor(private readonly dataSource: DataSource) {
    this.repository = this.dataSource.getRepository(
      ResultDuplicateResolutionLog,
    );
  }

  /** A run id shared by every record of one sync pass or sweep. */
  static newRunId(): string {
    return randomUUID();
  }

  /** Stable key for a normalized link — see the entity's `group_key_hash`. */
  static groupKeyHash(normalizedPublicLink: string): string {
    return createHash('sha256').update(normalizedPublicLink).digest('hex');
  }

  /**
   * Writes the group's plan. MUST be called before any deletion.
   *
   * @returns the persisted record id, to be passed to {@link recordOutcomes}.
   */
  async recordGroup(input: RecordGroupInput): Promise<number> {
    const record = this.repository.create({
      run_id: input.runId,
      source: input.source,
      mode: input.mode,
      group_key_hash: ResultDuplicateResolutionLogService.groupKeyHash(
        input.normalizedPublicLink,
      ),
      normalized_public_link: input.normalizedPublicLink,
      participants: input.participants,
      classification: input.classification,
      winner_result_id: input.winnerResultId ?? null,
      deciding_rule: input.decidingRule ?? null,
      deciding_result_id: input.decidingResultId ?? null,
      outcomes: input.plannedOutcomes,
      hard_delete_enabled: input.hardDeleteEnabled,
      confirmation_digest: input.confirmationDigest ?? null,
      reason: input.reason ?? null,
      deleted_count: 0,
      protected_count: this.countOf(
        input.plannedOutcomes,
        DuplicateRowOutcome.PROTECTED,
      ),
      failed_count: 0,
      noop_count: 0,
    });

    const saved = await this.repository.save(record);
    return Number(saved.id);
  }

  /**
   * Updates a record with what actually happened.
   *
   * Counts are derived from the outcomes rather than passed in, so a caller
   * cannot report three deletions while listing two.
   */
  async recordOutcomes(
    recordId: number,
    outcomes: DuplicateRowOutcomeRecord[],
  ): Promise<void> {
    await this.repository.update(recordId, {
      outcomes,
      deleted_count: this.countOf(outcomes, DuplicateRowOutcome.DELETED),
      protected_count: this.countOf(outcomes, DuplicateRowOutcome.PROTECTED),
      failed_count: this.countOf(outcomes, DuplicateRowOutcome.FAILED),
      noop_count: this.countOf(outcomes, DuplicateRowOutcome.NOOP),
    });
  }

  /** Every record of one run, oldest first. */
  async findByRunId(runId: string): Promise<ResultDuplicateResolutionLog[]> {
    return this.repository.find({
      where: { run_id: runId },
      order: { id: 'ASC' },
    });
  }

  /**
   * Answers "which rows did run X delete, and why" from stored data alone
   * (R-RES-009 AC.3).
   */
  async summarizeRun(runId: string): Promise<RunSummary> {
    const records = await this.findByRunId(runId);
    const byClassification: Record<string, number> = {};
    let deleted = 0;
    let protectedRows = 0;
    let failed = 0;
    let noop = 0;
    let refused = 0;

    for (const record of records) {
      byClassification[record.classification] =
        (byClassification[record.classification] ?? 0) + 1;
      deleted += Number(record.deleted_count ?? 0);
      protectedRows += Number(record.protected_count ?? 0);
      failed += Number(record.failed_count ?? 0);
      noop += Number(record.noop_count ?? 0);
      refused += this.countOf(
        record.outcomes ?? [],
        DuplicateRowOutcome.REFUSED,
      );
    }

    return {
      runId,
      groups: records.length,
      byClassification,
      deleted,
      protectedRows,
      failed,
      noop,
      refused,
    };
  }

  /**
   * Logs the protections and failures an operator needs to see immediately.
   *
   * The durable answer is the table; these lines are for the person watching a
   * run. Deliberately `warn` for anything retained or failed — a duplicate that
   * could not be removed is the case a human has to resolve.
   */
  logNotableOutcomes(
    runId: string,
    outcomes: DuplicateRowOutcomeRecord[],
  ): void {
    for (const outcome of outcomes) {
      if (outcome.outcome === DuplicateRowOutcome.PROTECTED) {
        this.logger.warn(
          `Run ${runId}: result ${outcome.resultId} retained — ${outcome.reason ?? 'referenced by a result that must survive'}.`,
        );
      }
      if (outcome.outcome === DuplicateRowOutcome.FAILED) {
        this.logger.warn(
          `Run ${runId}: deletion of result ${outcome.resultId} FAILED — ${outcome.reason ?? 'unknown error'}.`,
        );
      }
      if (outcome.outcome === DuplicateRowOutcome.REFUSED) {
        this.logger.warn(
          `Run ${runId}: deletion of result ${outcome.resultId} REFUSED — ${outcome.reason ?? 'identity has more than one live row; snapshot ownership is undecidable'}. Needs manual handling.`,
        );
      }
      if (outcome.outcome === DuplicateRowOutcome.NOOP) {
        this.logger.debug(
          `Run ${runId}: result ${outcome.resultId} was already absent; recorded as NOOP, not a deletion.`,
        );
      }
    }
  }

  private countOf(
    outcomes: DuplicateRowOutcomeRecord[],
    outcome: DuplicateRowOutcome,
  ): number {
    return outcomes.filter((entry) => entry.outcome === outcome).length;
  }
}
