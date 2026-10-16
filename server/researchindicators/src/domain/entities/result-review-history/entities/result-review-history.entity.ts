import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_review_history')
@Index('idx_result_review_history_result_created', ['result_id', 'created_at'])
@Index('idx_result_review_history_event_type', ['event_type'])
export class ResultReviewHistory extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'version_id',
    nullable: true,
  })
  version_id?: number;

  @Column('bigint', {
    name: 'actor_user_id',
    nullable: false,
  })
  actor_user_id!: number;

  @Column('varchar', {
    name: 'event_type',
    length: 50,
    nullable: false,
  })
  event_type!: string;

  @Column('varchar', {
    name: 'decision',
    length: 20,
    nullable: true,
  })
  decision?: string;

  @Column('text', {
    name: 'justification',
    nullable: true,
  })
  justification?: string;

  @Column('json', {
    name: 'payload_before',
    nullable: true,
  })
  payload_before?: Record<string, unknown>;

  @Column('json', {
    name: 'payload_after',
    nullable: true,
  })
  payload_after?: Record<string, unknown>;

  // No @ManyToOne on purpose (2026-09-22). `fk_rrh_result` was dropped: this is an
  // append-only audit trail, and the constraint blocked deleting a result while
  // the alternative -- deleting the history -- destroyed the record of what
  // changed. `result_id` remains a plain indexed column, so a row whose result is
  // later deleted stays readable instead of blocking the delete.
}
