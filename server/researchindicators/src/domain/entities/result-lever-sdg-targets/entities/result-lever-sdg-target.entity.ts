import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';
import { ClarisaSdgTarget } from '../../../tools/clarisa/entities/clarisa-sdg-targets/entities/clarisa-sdg-target.entity';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_lever_sdg_targets')
export class ResultLeverSdgTarget extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'result_lever_sdg_target_id',
  })
  result_lever_sdg_target_id!: number;

  @Column('bigint', {
    name: 'result_lever_id',
    nullable: false,
  })
  result_lever_id!: number;

  @Column('bigint', {
    name: 'sdg_target_id',
    nullable: false,
  })
  @ApiProperty({
    type: Number,
    name: 'sdg_target_id',
  })
  sdg_target_id!: number;

  @ManyToOne(
    () => ResultLever,
    (resultLever) => resultLever.result_lever_sdg_targets,
  )
  @JoinColumn({ name: 'result_lever_id' })
  result_lever!: ResultLever;

  @ManyToOne(
    () => ClarisaSdgTarget,
    (sdgTarget) => sdgTarget.result_lever_sdg_targets,
  )
  @JoinColumn({ name: 'sdg_target_id' })
  sdg_target!: ClarisaSdgTarget;
}
