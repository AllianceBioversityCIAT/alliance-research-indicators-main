import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ImpersonationEndReasonEnum } from '../enum/impersonation-end-reason.enum';

@Entity('impersonation_sessions')
@Index('idx_impersonation_sessions_actor_open', ['actor_user_id', 'ended_at'])
@Index('idx_impersonation_sessions_target', ['target_user_id'])
export class ImpersonationSession extends AuditableEntity {
  @PrimaryColumn('char', {
    name: 'session_id',
    length: 36,
  })
  session_id!: string;

  @Column('bigint', {
    name: 'actor_user_id',
    nullable: false,
  })
  actor_user_id!: number;

  @Column('bigint', {
    name: 'target_user_id',
    nullable: false,
  })
  target_user_id!: number;

  @Column('text', {
    name: 'reason',
    nullable: true,
  })
  reason?: string;

  @Column('timestamp', {
    name: 'started_at',
    precision: 6,
    nullable: false,
  })
  started_at!: Date;

  @Column('timestamp', {
    name: 'expires_at',
    precision: 6,
    nullable: false,
  })
  expires_at!: Date;

  @Column('timestamp', {
    name: 'ended_at',
    precision: 6,
    nullable: true,
  })
  ended_at?: Date;

  @Column('enum', {
    name: 'end_reason',
    enum: ImpersonationEndReasonEnum,
    nullable: true,
  })
  end_reason?: ImpersonationEndReasonEnum;
}
