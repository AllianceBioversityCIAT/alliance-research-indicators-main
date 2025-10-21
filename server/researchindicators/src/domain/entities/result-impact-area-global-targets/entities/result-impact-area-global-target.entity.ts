import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultImpactArea } from '../../result-impact-areas/entities/result-impact-area.entity';
import { ClarisaGlobalTarget } from '../../../tools/clarisa/entities/clarisa-global-targets/entities/clarisa-global-target.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_impact_area_global_target')
export class ResultImpactAreaGlobalTarget extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_impact_area_id',
    type: 'bigint',
    nullable: false,
  })
  result_impact_area_id: number;

  @Column({
    name: 'global_target_id',
    type: 'bigint',
    nullable: false,
  })
  @ApiProperty()
  global_target_id: number;

  @ManyToOne(
    () => ResultImpactArea,
    (resultImpactArea) => resultImpactArea.result_impact_area_global_targets,
  )
  @JoinColumn({ name: 'result_impact_area_id' })
  result_impact_area: ResultImpactArea;

  @ManyToOne(
    () => ClarisaGlobalTarget,
    (clarisaGlobalTarget) =>
      clarisaGlobalTarget.result_impact_area_global_targets,
  )
  @JoinColumn({ name: 'global_target_id' })
  clarisa_global_target: ClarisaGlobalTarget;
}
