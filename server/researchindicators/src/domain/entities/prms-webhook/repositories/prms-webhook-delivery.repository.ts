import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { LoggerUtil } from '../../../shared/utils/logger.util';
import { DeliveryCorrelationOutcome } from '../enum/delivery-correlation-outcome.enum';
import { DeliveryProcessingState } from '../enum/delivery-processing-state.enum';
import { PrmsWebhookDelivery } from '../entities/prms-webhook-delivery.entity';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-05 /
// R-PWH-006 AC.1, AC.2, AC.4, AC.5, AC.7 · R-PWH-005 AC.7, AC.8 ·
// R-PWH-003 AC.5 · NFR-PWH-001 · design §3.1, §6.3 steps 3 + 3b, DD-5.

/**
 * The two MySQL contention errors step 3b retries — BOTH, not one
 * (design DD-5, §6.3 step 3b). Codes as `sql-errors.const.ts` names them:
 * 1205 `ER_LOCK_WAIT_TIMEOUT`, 1213 `ER_LOCK_DEADLOCK`. TypeORM's
 * `QueryFailedError` copies the driver's `errno` onto itself, so the
 * top-level field is the one to read.
 */
const RETRYABLE_LOCK_ERRNOS: ReadonlySet<number> = new Set([1205, 1213]);

const lockErrno = (error: unknown): number | undefined => {
  const errno = (error as { errno?: unknown } | null)?.errno;
  return typeof errno === 'number' ? errno : undefined;
};

const isRetryableLockError = (error: unknown): boolean => {
  const errno = lockErrno(error);
  return errno !== undefined && RETRYABLE_LOCK_ERRNOS.has(errno);
};

/**
 * The domain columns plus the audit columns the entity selects by default.
 * `created_by`, `updated_by` and `deleted_at` are `select: false` on
 * `AuditableEntity` and stay out here too.
 */
const HISTORY_COLUMNS = [
  'id',
  'delivery_id',
  'occurred_at',
  'environment',
  'correlation_outcome',
  'result_id',
  'external_reference',
  'prms_result_id',
  'prms_result_code',
  'decision',
  'justification',
  'decided_at',
  'raw_body',
  'raw_headers',
  'processing_state',
  'processing_error',
  'duplicate_of_id',
  'event_source',
  'status',
  'actor_user_id',
  'reviewer_name',
  'reviewer_role',
  'science_program_code',
  'changes',
  'created_at',
  'updated_at',
  'is_active',
].join(', ');

/** One row as mysql2 returns it: BIGINT as string, JSON already parsed. */
type RawDeliveryRow = Record<string, unknown>;

/**
 * `event_source` for every row `recordDelivery` writes. This method
 * handles inbound PRMS deliveries only (see the class doc); T-11's
 * outbound `PENDING_REVIEW` write is a separate, new method and is not
 * routed through here (design Pivot, decision 6).
 */
const EVENT_SOURCE_INBOUND = 'PRMS';

/**
 * `event_source` / `status` for every row `recordOutboundPendingReview`
 * writes (T-11, Pivot decisions 2 + 3). STAR's own successful push, never
 * a PRMS delivery.
 */
const EVENT_SOURCE_OUTBOUND = 'STAR';
const OUTBOUND_STATUS_PENDING_REVIEW = 'PENDING_REVIEW';

const asNullableNumber = (value: unknown): number | null =>
  value == null ? null : Number(value);

const asBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1';

const toDelivery = (row: RawDeliveryRow): PrmsWebhookDelivery => {
  const delivery = new PrmsWebhookDelivery();
  delivery.id = Number(row.id);
  delivery.delivery_id = (row.delivery_id as string | null) ?? null;
  delivery.occurred_at = row.occurred_at as Date;
  delivery.environment = row.environment as string;
  delivery.correlation_outcome =
    row.correlation_outcome as DeliveryCorrelationOutcome;
  delivery.result_id = asNullableNumber(row.result_id);
  delivery.external_reference =
    (row.external_reference as string | null) ?? null;
  delivery.prms_result_id = asNullableNumber(row.prms_result_id);
  delivery.prms_result_code = asNullableNumber(row.prms_result_code);
  delivery.decision = (row.decision as string | null) ?? null;
  delivery.justification = (row.justification as string | null) ?? null;
  delivery.decided_at = (row.decided_at as Date | null) ?? null;
  delivery.raw_body = (row.raw_body as Record<string, unknown> | null) ?? null;
  delivery.raw_headers =
    (row.raw_headers as Record<string, unknown> | null) ?? null;
  delivery.processing_state = row.processing_state as string;
  delivery.processing_error = (row.processing_error as string | null) ?? null;
  delivery.duplicate_of_id = asNullableNumber(row.duplicate_of_id);
  delivery.event_source = row.event_source as string;
  delivery.status = (row.status as string | null) ?? null;
  delivery.actor_user_id = asNullableNumber(row.actor_user_id);
  delivery.reviewer_name = (row.reviewer_name as string | null) ?? null;
  delivery.reviewer_role = (row.reviewer_role as string | null) ?? null;
  delivery.science_program_code =
    (row.science_program_code as string | null) ?? null;
  delivery.changes = (row.changes as Record<string, unknown> | null) ?? null;
  delivery.created_at = row.created_at as Date;
  delivery.updated_at = (row.updated_at as Date | null) ?? undefined;
  delivery.is_active = asBoolean(row.is_active);
  return delivery;
};

const asOk = (result: unknown): { insertId?: number } => {
  if (Array.isArray(result)) {
    return (result[0] ?? {}) as { insertId?: number };
  }
  return (result ?? {}) as { insertId?: number };
};

/**
 * What the caller (T-09) hands over for one inbound delivery. The caller
 * classifies the body; it can NOT classify a delivery as `DUPLICATE` —
 * only the dedupe transaction below may decide that.
 */
export interface RecordDeliveryInput {
  delivery_id: string | null;
  occurred_at: Date;
  environment: string;
  correlation_outcome: Exclude<
    DeliveryCorrelationOutcome,
    DeliveryCorrelationOutcome.DUPLICATE
  >;
  external_reference: string | null;
  prms_result_id: number | null;
  prms_result_code: number | null;
  decision: string | null;
  justification: string | null;
  decided_at: Date | null;
  raw_body: Record<string, unknown> | null;
  raw_headers: Record<string, unknown> | null;
}

export type RecordDeliveryResult =
  | {
      kind: 'recorded';
      deliveryRowId: number;
      correlationOutcome: DeliveryCorrelationOutcome;
    }
  | { kind: 'duplicate'; deliveryRowId: number; duplicateOfId: number };

/**
 * What T-11's guarded call in `ResultPrmsSyncService` hands over for one
 * successful outbound push. Deliberately narrow: `decision`,
 * `justification`, `decided_at`, `delivery_id`, `raw_body`, `raw_headers`
 * and every `reviewer_*` field are not parameters here at all — an
 * outbound event has none of them, and the row shape enforces that
 * structurally rather than trusting every caller to pass `null`.
 */
export interface RecordOutboundPendingReviewInput {
  resultId: number;
  userId: number | null;
  occurredAt: Date;
  environment: string;
  externalReference: string | null;
  prmsResultCode: number | null;
}

@Injectable()
export class PrmsWebhookDeliveryRepository {
  private readonly logger = new LoggerUtil({
    name: PrmsWebhookDeliveryRepository.name,
  });

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Design §6.3 step 3 — ONE transaction: the dedupe `FOR UPDATE` read on
   * `delivery_id`, then the insert (either the classified outcome or a
   * `DUPLICATE` pointing at the row it repeats). Step 3b — on a MySQL lock
   * conflict (1213 / 1205) the whole transaction is retried ONCE, then the
   * error propagates: a delivery is never silently dropped (AC.7, DC-12).
   *
   * Why the retry exists (DD-5): no isolation level is configured, so InnoDB
   * runs REPEATABLE READ; an empty `FOR UPDATE` range read takes gap locks,
   * gap locks are mutually compatible, and each INSERT then needs an
   * insert-intention lock that waits on the other's gap. Two genuinely
   * simultaneous deliveries of one id therefore deadlock — one is rolled
   * back — rather than double-apply. The retried transaction then finds the
   * winner's row and records itself as the DUPLICATE it is.
   */
  async recordDelivery(
    input: RecordDeliveryInput,
  ): Promise<RecordDeliveryResult> {
    try {
      return await this.runRecordTransaction(input);
    } catch (firstError) {
      if (!isRetryableLockError(firstError)) {
        throw firstError;
      }
      this.logger._warn(
        `Lock conflict (errno ${lockErrno(firstError)}) recording PRMS delivery ${input.delivery_id ?? '<no delivery id>'} — retrying the transaction once`,
      );
      try {
        return await this.runRecordTransaction(input);
      } catch (secondError) {
        this.logger._error(
          `PRMS delivery ${input.delivery_id ?? '<no delivery id>'} could not be recorded after one retry (errno ${lockErrno(secondError)})`,
        );
        throw secondError;
      }
    }
  }

  private runRecordTransaction(
    input: RecordDeliveryInput,
  ): Promise<RecordDeliveryResult> {
    return this.dataSource.transaction((manager) =>
      this.recordInsideLock(manager, input),
    );
  }

  private async recordInsideLock(
    manager: EntityManager,
    input: RecordDeliveryInput,
  ): Promise<RecordDeliveryResult> {
    let duplicateOfId: number | null = null;
    // A delivery without `x-prms-delivery-id` cannot be deduplicated and is
    // never a duplicate of anything (R-PWH-006 AC.4). Skipping the read makes
    // that structural: no query is ever issued that could pair two NULLs.
    if (input.delivery_id !== null) {
      const originals = await manager.query(
        `
        SELECT id
        FROM result_prms_sync_history
        WHERE delivery_id = ? AND duplicate_of_id IS NULL
        FOR UPDATE
        `,
        [input.delivery_id],
      );
      if (originals[0]) {
        duplicateOfId = Number(originals[0].id);
      }
    }

    const correlationOutcome: DeliveryCorrelationOutcome =
      duplicateOfId === null
        ? input.correlation_outcome
        : DeliveryCorrelationOutcome.DUPLICATE;

    const insertResult = await manager.query(
      `
      INSERT INTO result_prms_sync_history
        (delivery_id, occurred_at, environment, correlation_outcome, result_id,
         external_reference, prms_result_id, prms_result_code, decision,
         justification, decided_at, raw_body, raw_headers, processing_state,
         processing_error, duplicate_of_id, created_by, is_active,
         event_source, status, actor_user_id, reviewer_name, reviewer_role,
         science_program_code, changes)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, TRUE,
              ?, NULL, NULL, NULL, NULL, NULL, NULL)
      `,
      // 25 columns, 15 placeholders + 10 literals (result_id, processing_error
      // and created_by are NULL at insert; is_active is TRUE; the six
      // Pivot columns this ingest path never populates -- status,
      // actor_user_id, reviewer_name, reviewer_role, science_program_code,
      // changes -- are NULL, T-11's outbound write is the only path that
      // fills them). Keep this list and the array below in lockstep -- a
      // stray param shifts every value one column right and MySQL reports
      // it at the first type mismatch, nowhere near the real mistake (the
      // same warning sits on the INSERT in `result-prms-sync-log.repository.ts`,
      // `claimInsideLock`).
      [
        input.delivery_id,
        input.occurred_at,
        input.environment,
        correlationOutcome,
        input.external_reference,
        input.prms_result_id,
        input.prms_result_code,
        input.decision,
        input.justification,
        input.decided_at,
        input.raw_body === null ? null : JSON.stringify(input.raw_body),
        input.raw_headers === null ? null : JSON.stringify(input.raw_headers),
        DeliveryProcessingState.RECEIVED,
        duplicateOfId,
        // event_source is NOT NULL (the Pivot's discriminator). Every row
        // this method writes is an inbound PRMS delivery -- the class doc
        // says so -- so the literal is fixed here, not threaded through
        // RecordDeliveryInput. T-11's own write path is a separate method.
        EVENT_SOURCE_INBOUND,
      ],
    );
    const deliveryRowId = Number(asOk(insertResult).insertId);

    if (duplicateOfId !== null) {
      return { kind: 'duplicate', deliveryRowId, duplicateOfId };
    }
    return { kind: 'recorded', deliveryRowId, correlationOutcome };
  }

  /**
   * History for one STAR result, in received order (R-PWH-005 AC.8).
   * Plain read, no transaction, no lock, no `is_active` filter — nothing in
   * this spec flips that flag, and filtering on it would be a way to hide
   * history rows.
   */
  async findHistoryByResultId(
    resultId: number,
  ): Promise<PrmsWebhookDelivery[]> {
    const rows = await this.dataSource.query(
      `
      SELECT ${HISTORY_COLUMNS}
      FROM result_prms_sync_history
      WHERE result_id = ?
      ORDER BY occurred_at ASC, id ASC
      `,
      [resultId],
    );
    return (rows as RawDeliveryRow[]).map(toDelivery);
  }

  /**
   * History across every result, uncorrelated rows (`result_id IS NULL`)
   * included, in received order (R-PWH-005 AC.8). Deliberately no WHERE.
   */
  async findHistory(): Promise<PrmsWebhookDelivery[]> {
    const rows = await this.dataSource.query(
      `
      SELECT ${HISTORY_COLUMNS}
      FROM result_prms_sync_history
      ORDER BY occurred_at ASC, id ASC
      `,
    );
    return (rows as RawDeliveryRow[]).map(toDelivery);
  }

  /**
   * T-11 — one row per successful outbound push, written from STAR's own
   * data (Pivot decisions 2, 3). A plain `INSERT`, outside any
   * transaction: unlike `recordDelivery`, there is no `delivery_id` to
   * dedupe on, so the `SELECT … FOR UPDATE` dedupe read does not apply
   * here (Pivot decision 6) — running it would take gap locks on the
   * push's critical path and protect nothing.
   *
   * `decision`, `justification`, `decided_at`, `delivery_id`, `raw_body`,
   * `raw_headers`, `prms_result_id` and every `reviewer_*` field are
   * `NULL` literals, never parameters — an outbound event carries none of
   * PRMS's inbound data (design Pivot).
   *
   * The caller (`ResultPrmsSyncService`) MUST catch: this write must
   * never fail an already-successful push (Pivot decision 5 — the same
   * discipline T-09's `PrmsWebhookDeliveryService` applies to its
   * detached correlator).
   */
  async recordOutboundPendingReview(
    input: RecordOutboundPendingReviewInput,
  ): Promise<void> {
    await this.dataSource.query(
      `
      INSERT INTO result_prms_sync_history
        (delivery_id, occurred_at, environment, correlation_outcome, result_id,
         external_reference, prms_result_id, prms_result_code, decision,
         justification, decided_at, raw_body, raw_headers, processing_state,
         processing_error, duplicate_of_id, created_by, is_active,
         event_source, status, actor_user_id, reviewer_name, reviewer_role,
         science_program_code, changes)
      VALUES (NULL, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL, NULL, TRUE,
              ?, ?, ?, NULL, NULL, NULL, NULL)
      `,
      // 25 columns, 10 placeholders + 15 literals. Kept in lockstep with
      // the column list for the same reason `recordInsideLock` flags —
      // a stray param shifts every value one column right.
      [
        input.occurredAt,
        input.environment,
        DeliveryCorrelationOutcome.CORRELATED,
        input.resultId,
        input.externalReference,
        input.prmsResultCode,
        DeliveryProcessingState.PROCESSED,
        EVENT_SOURCE_OUTBOUND,
        OUTBOUND_STATUS_PENDING_REVIEW,
        input.userId,
      ],
    );
  }
}
