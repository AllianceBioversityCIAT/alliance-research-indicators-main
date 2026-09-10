// @akili-spec docs/specs/changes/my-pi-delegates — T-16
//
// NOTE: `pi_delegate_id`, `pi_user_id`, and `delegate_user_id` are plain
// columns (no FK / @ManyToOne). The history table is append-only and
// intentionally decoupled from the mutable `pi_delegates` row (DD-O).
// `sec_users` has no TypeORM @Entity class in this codebase — plain
// @Column declarations consistent with every other entity that references
// sec_users FKs.
//
// NOTE: There is no generated column on this table. Multiple movements per
// relationship are valid; uniqueness is enforced only on `pi_delegates`
// (design §11.1).
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { PiDelegateHistoryActionEnum } from '../enum/pi-delegate-history-action.enum';

@Entity('pi_delegate_history')
export class PiDelegateHistory extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'pi_delegate_history_id',
    type: 'bigint',
  })
  pi_delegate_history_id!: number;

  @Column('bigint', {
    name: 'pi_delegate_id',
    nullable: false,
  })
  pi_delegate_id!: number;

  @Column('varchar', {
    name: 'project_id',
    length: 36,
    nullable: false,
  })
  project_id!: string;

  @Column('bigint', {
    name: 'pi_user_id',
    nullable: false,
  })
  pi_user_id!: number;

  @Column('bigint', {
    name: 'delegate_user_id',
    nullable: false,
  })
  delegate_user_id!: number;

  @Column({
    name: 'action',
    type: 'varchar',
    length: 10,
    nullable: false,
  })
  action!: PiDelegateHistoryActionEnum;
}
