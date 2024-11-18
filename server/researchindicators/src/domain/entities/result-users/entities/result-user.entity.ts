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
import { ApiProperty } from '@nestjs/swagger';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';

@Entity('result_users')
export class ResultUser extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_user_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_user_id',
    type: 'bigint',
  })
  result_user_id!: number;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @ApiProperty({
    type: Number,
    name: 'user_id',
  })
  @Column('varchar', {
    name: 'user_id',
    length: 10,
    nullable: false,
  })
  user_id!: string;

  @ApiProperty({
    type: Number,
    name: 'user_role_id',
  })
  @Column('bigint', {
    name: 'user_role_id',
    nullable: false,
  })
  user_role_id!: number;

  @ManyToOne(() => AllianceUserStaff, (user) => user.result_users)
  @JoinColumn({ name: 'user_id' })
  user!: AllianceUserStaff;

  @ManyToOne(() => Result, (result) => result.result_users)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => UserRole, (role) => role.result_users)
  @JoinColumn({ name: 'user_role_id' })
  role!: UserRole;
}
