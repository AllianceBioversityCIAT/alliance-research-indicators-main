import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { PrmsSyncOutcome } from '../../../tools/prms-normalizer/enum/prms-sync-outcome.enum';

/**
 * Append-only PRMS sync attempt log. Columns match migration
 * `1789479131116-createResultPrmsSyncLogTable` one-for-one, including the
 * three independently-nullable fields: `prms_type` (refused before build /
 * expired UNKNOWN), `http_status` (transport failure / STAR refusal / UNKNOWN),
 * `request_id` (an attempt expired to UNKNOWN before PRMS assigned one).
 *
 * Nest module / route registration is T-13 — this file is entity-only.
 */
@Entity('result_prms_sync_log')
@Index('idx_result_prms_sync_log_code_year', [
  'external_reference',
  'result_year',
])
@Index('idx_result_prms_sync_log_request_id', ['request_id'])
export class ResultPrmsSyncLog extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id!: number;

  /**
   * Reporting year of the result this attempt describes. Paired with
   * `external_reference` -- which already carries the result official code -- it
   * identifies the subject the way PRMS does, with no surrogate key.
   *
   * Deliberately NOT a foreign key (2026-09-21). The log is a permanent record of
   * what was sent to an external system; an FK made it hostage to the row it
   * describes, blocking result deletion and making the alternative -- deleting the
   * history -- destroy evidence of a push PRMS had already accepted. Nullable so a
   * deleted result leaves a readable, orphaned record rather than a broken one.
   */
  @Column({
    type: 'year',
    name: 'result_year',
    nullable: true,
  })
  result_year?: number | null;

  @Column({
    type: 'int',
    name: 'attempt_number',
    nullable: false,
  })
  attempt_number!: number;

  @Column({
    type: 'varchar',
    name: 'environment',
    length: 20,
    nullable: false,
  })
  environment!: string;

  @Column({
    type: 'varchar',
    name: 'prms_type',
    length: 50,
    nullable: true,
  })
  prms_type?: string | null;

  @Column({
    type: 'varchar',
    name: 'outcome',
    length: 40,
    nullable: false,
  })
  outcome!: PrmsSyncOutcome;

  @Column({
    type: 'int',
    name: 'http_status',
    nullable: true,
  })
  http_status?: number | null;

  @Column({
    type: 'varchar',
    name: 'request_id',
    length: 191,
    nullable: true,
  })
  request_id?: string | null;

  @Column({
    type: 'varchar',
    name: 'external_reference',
    length: 191,
    nullable: true,
  })
  external_reference?: string | null;

  @Column({
    type: 'json',
    name: 'request_payload',
    nullable: true,
  })
  request_payload?: Record<string, unknown> | null;

  @Column({
    type: 'json',
    name: 'response_body',
    nullable: true,
  })
  response_body?: Record<string, unknown> | null;

  @Column({
    type: 'text',
    name: 'failure_reason',
    nullable: true,
  })
  failure_reason?: string | null;
}
