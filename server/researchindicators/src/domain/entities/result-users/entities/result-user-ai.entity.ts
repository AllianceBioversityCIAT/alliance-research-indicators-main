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

@Entity('result_user_ai')
export class ResultUserAi extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'institution_id',
    type: 'varchar',
    length: 10,
  })
  user_code: string;

  @Column({
    type: 'bigint',
    name: 'user_role_id',
    nullable: false,
  })
  user_role_id!: number;

  @Column({
    name: 'institution_name',
    type: 'text',
  })
  user_name: string;

  @Column({
    name: 'score',
    type: 'float',
  })
  score: number;

  @ManyToOne(() => Result, (result) => result.users_ai)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(() => UserRole, (userRole) => userRole.result_users_ai)
  @JoinColumn({ name: 'user_role_id' })
  user_role!: UserRole;
}
