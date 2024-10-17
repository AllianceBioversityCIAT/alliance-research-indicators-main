import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { LeverRole } from '../../lever-roles/entities/lever-role.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaLever } from '../../../tools/clarisa/entities/clarisa-levers/entities/clarisa-lever.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_levers')
export class ResultLever extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_lever_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_lever_id',
    type: 'bigint',
  })
  result_lever_id!: number;

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
    type: String,
    name: 'lever_id',
  })
  @Column('bigint', {
    name: 'lever_id',
    nullable: false,
  })
  lever_id!: string;

  @ApiProperty({
    type: Number,
    name: 'lever_role_id',
  })
  @Column('bigint', {
    name: 'lever_role_id',
    nullable: false,
  })
  lever_role_id!: number;

  @ManyToOne(() => LeverRole, (leverRole) => leverRole.result_levers)
  @JoinColumn({ name: 'lever_role_id' })
  lever_role!: LeverRole;

  @ManyToOne(() => Result, (result) => result.result_levers)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => ClarisaLever, (clarisaLever) => clarisaLever.result_levers)
  @JoinColumn({ name: 'lever_id' })
  lever!: ClarisaLever;
}
