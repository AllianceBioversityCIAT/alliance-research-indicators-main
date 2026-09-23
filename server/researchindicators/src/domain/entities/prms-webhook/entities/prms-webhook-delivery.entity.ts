import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { DeliveryCorrelationOutcome } from '../enum/delivery-correlation-outcome.enum';

/**
 * Append-only synchronization HISTORY between STAR and PRMS (design.md
 * §4, amended 2026-09-23 by the owner-approved Pivot — see
 * execution.md "Pivot Record: T-01"). Originally specified as an
 * inbound-only delivery log; it also records STAR's own successful
 * outbound pushes now, discriminated by `event_source`. Class and file
 * names are kept as `PrmsWebhookDelivery` / `prms-webhook-delivery.entity.ts`
 * — a deliberate T-01b readability call, see the migration's header
 * comment and the task report for the reasoning. Nest module
 * registration is T-03 — this file is entity-only.
 *
 * There is NO `result_id` column, and there never was a foreign key
 * (P-2). An UNKNOWN_REFERENCE row must survive, and deleting or
 * overwriting a result must not erase the history of what the hook sent —
 * an overwrite deletes the internal id permanently. The durable identity
 * is the pair (`result_official_code`, `result_year`). An inbound PRMS
 * delivery carries neither year nor id; the correlator resolves the live
 * row, keeps its id only to pick and validate that row, and stores
 * `results.report_year_id`.
 *
 * `delivery_id` is deliberately NOT unique (DD-5). A unique index would
 * forbid the repeat row R-PWH-005 requires.
 */
@Entity('result_prms_sync_history')
@Index('idx_result_prms_sync_history_delivery_id', ['delivery_id'])
@Index('idx_result_prms_sync_history_occurred_at', ['occurred_at'])
@Index('idx_result_prms_sync_history_code_year', [
  'result_official_code',
  'result_year',
])
export class PrmsWebhookDelivery extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id!: number;

  @Column({
    type: 'varchar',
    name: 'delivery_id',
    length: 191,
    nullable: true,
  })
  delivery_id?: string | null;

  @Column({
    type: 'timestamp',
    name: 'occurred_at',
    nullable: false,
  })
  occurred_at!: Date;

  @Column({
    type: 'varchar',
    name: 'environment',
    length: 20,
    nullable: false,
  })
  environment!: string;

  @Column({
    type: 'varchar',
    name: 'correlation_outcome',
    length: 40,
    nullable: false,
  })
  correlation_outcome!: DeliveryCorrelationOutcome;

  @Column({
    type: 'varchar',
    name: 'result_official_code',
    length: 191,
    nullable: true,
  })
  result_official_code?: string | null;

  /**
   * Reporting year, paired with `result_official_code` (the official code).
   * MySQL YEAR, nullable: an inbound delivery has no year, and a deleted
   * result must leave a readable row. Same type as
   * `result_prms_sync_log.result_year`.
   */
  @Column({
    type: 'year',
    name: 'result_year',
    nullable: true,
  })
  result_year?: number | null;

  @Column({
    type: 'bigint',
    name: 'prms_result_id',
    nullable: true,
  })
  prms_result_id?: number | null;

  @Column({
    type: 'bigint',
    name: 'prms_result_code',
    nullable: true,
  })
  prms_result_code?: number | null;

  @Column({
    type: 'varchar',
    name: 'decision',
    length: 20,
    nullable: true,
  })
  decision?: string | null;

  @Column({
    type: 'text',
    name: 'justification',
    nullable: true,
  })
  justification?: string | null;

  @Column({
    type: 'timestamp',
    name: 'decided_at',
    nullable: true,
  })
  decided_at?: Date | null;

  @Column({
    type: 'json',
    name: 'raw_body',
    nullable: true,
  })
  raw_body?: Record<string, unknown> | null;

  @Column({
    type: 'json',
    name: 'raw_headers',
    nullable: true,
  })
  raw_headers?: Record<string, unknown> | null;

  @Column({
    type: 'varchar',
    name: 'processing_state',
    length: 20,
    nullable: false,
  })
  processing_state!: string;

  @Column({
    type: 'text',
    name: 'processing_error',
    nullable: true,
  })
  processing_error?: string | null;

  @Column({
    type: 'bigint',
    name: 'duplicate_of_id',
    nullable: true,
  })
  duplicate_of_id?: number | null;

  /**
   * `'STAR'` | `'PRMS'` — which side generated the row. The discriminator
   * that keeps the two populations legible; every query meaning
   * "deliveries" must filter on it. The only NOT NULL addition.
   */
  @Column({
    type: 'varchar',
    name: 'event_source',
    length: 10,
    nullable: false,
  })
  event_source!: string;

  /**
   * `'PENDING_REVIEW'` | `'APPROVED'` | `'REJECTED'` — the timeline
   * badge. Derivable from event_source + decision, but stored: the
   * table is append-only, the value is fixed at write time.
   */
  @Column({
    type: 'varchar',
    name: 'status',
    length: 30,
    nullable: true,
  })
  status?: string | null;

  /** Outbound only. Our user -> sec_users. An id, not a stored name. */
  @Column({
    type: 'bigint',
    name: 'actor_user_id',
    nullable: true,
  })
  actor_user_id?: number | null;

  /**
   * Inbound only. Name only, no id -- a PRMS reviewer does not exist
   * in our system.
   */
  @Column({
    type: 'varchar',
    name: 'reviewer_name',
    length: 255,
    nullable: true,
  })
  reviewer_name?: string | null;

  /** Inbound only. The label as sent, for display. */
  @Column({
    type: 'varchar',
    name: 'reviewer_role',
    length: 191,
    nullable: true,
  })
  reviewer_role?: string | null;

  /**
   * Inbound only. Deliberately separate from reviewer_role: the role is
   * display, this is data — filterable, joinable to CLARISA later.
   */
  @Column({
    type: 'varchar',
    name: 'science_program_code',
    length: 20,
    nullable: true,
  })
  science_program_code?: string | null;

  /**
   * The "See what changed" payload. JSON rather than a table because
   * PRMS has committed to no shape. Display-only today.
   */
  @Column({
    type: 'json',
    name: 'changes',
    nullable: true,
  })
  changes?: Record<string, unknown> | null;
}
