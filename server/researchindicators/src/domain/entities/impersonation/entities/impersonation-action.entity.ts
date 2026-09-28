import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ImpersonationSession } from './impersonation-session.entity';

// Append-only audit trail (created_at only); deliberately does NOT extend
// AuditableEntity — rows are never updated or soft-deleted after insert.
@Entity('impersonation_actions')
@Index('idx_impersonation_actions_session', ['session_id'])
export class ImpersonationAction {
  @PrimaryGeneratedColumn({
    name: 'action_id',
    type: 'bigint',
  })
  action_id!: number;

  @Column('char', {
    name: 'session_id',
    length: 36,
    nullable: false,
  })
  session_id!: string;

  @Column('varchar', {
    name: 'method',
    length: 10,
    nullable: false,
  })
  method!: string;

  @Column('varchar', {
    name: 'route_pattern',
    length: 255,
    nullable: false,
  })
  route_pattern!: string;

  @Column('varchar', {
    name: 'path',
    length: 512,
    nullable: false,
  })
  path!: string;

  @Column('smallint', {
    name: 'status_code',
    nullable: false,
  })
  status_code!: number;

  @Column('bigint', {
    name: 'result_official_code',
    nullable: true,
  })
  result_official_code?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    precision: 6,
    nullable: false,
  })
  created_at?: Date;

  @ManyToOne(() => ImpersonationSession)
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'fk_impersonation_actions_session',
  })
  session!: ImpersonationSession;
}
