import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { UserRole } from '../../user-roles/entities/user-role.entity';

@Entity('result_users')
export class ResultUser extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_user_id',
    type: 'bigint',
  })
  result_user_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'user_id',
    nullable: false,
  })
  user_id!: number;

  @Column('bigint', {
    name: 'role_id',
    nullable: false,
  })
  role_id!: number;

  @ManyToOne(() => Result, (result) => result.result_users)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => UserRole, (role) => role.result_users)
  @JoinColumn({ name: 'role_id' })
  role!: UserRole;
}
