import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { DeliveryCorrelationOutcome } from '../enum/delivery-correlation-outcome.enum';

/**
 * Append-only record of every inbound PRMS decision-webhook delivery.
 * Columns match design.md §4 one-for-one. Nest module registration is
 * T-03 — this file is entity-only.
 *
 * `result_id` is deliberately NOT a foreign key (P-2). An
 * UNKNOWN_REFERENCE row must survive, and deleting a result later must
 * not erase the history of what the hook sent.
 *
 * `delivery_id` is deliberately NOT unique (DD-5). A unique index would
 * forbid the repeat row R-PWH-005 requires.
 */
@Entity('prms_webhook_delivery')
@Index('idx_prms_webhook_delivery_delivery_id', ['delivery_id'])
@Index('idx_prms_webhook_delivery_result', ['result_id'])
@Index('idx_prms_webhook_delivery_received_at', ['received_at'])
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
    name: 'received_at',
    nullable: false,
  })
  received_at!: Date;

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
    type: 'bigint',
    name: 'result_id',
    nullable: true,
  })
  result_id?: number | null;

  @Column({
    type: 'varchar',
    name: 'external_reference',
    length: 191,
    nullable: true,
  })
  external_reference?: string | null;

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
}
