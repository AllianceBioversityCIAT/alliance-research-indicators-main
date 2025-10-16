import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { QuantificationRole } from '../../quantification-roles/entities/quantification-role.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_quantifications')
export class ResultQuantification extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'quantification_number',
    nullable: false,
  })
  @ApiProperty()
  quantification_number: number;

  @Column({
    type: 'text',
    name: 'unit',
    nullable: false,
  })
  @ApiProperty()
  unit: string;

  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
  })
  @ApiProperty()
  description: string;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'quantification_role_id',
  })
  quantification_role_id: number;

  @ManyToOne(() => Result, (result) => result.result_quantifications)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => QuantificationRole,
    (quantificationRole) => quantificationRole.result_quantifications,
  )
  @JoinColumn({ name: 'quantification_role_id' })
  quantification_role: QuantificationRole;
}
