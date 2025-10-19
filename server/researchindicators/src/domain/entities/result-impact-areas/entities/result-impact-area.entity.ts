import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaImpactArea } from '../../../tools/clarisa/entities/clarisa-impact-areas/entities/clarisa-impact-area.entity';
import { ImpactAreaScore } from '../../impact-area-score/entities/impact-area-score.entity';

@Entity('result_impact_areas')
export class ResultImpactArea extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'impact_area_id',
  })
  impact_area_id: number;

  @Column({
    type: 'bigint',
    name: 'impact_area_score_id',
  })
  impact_area_score_id: number;

  @ManyToOne(() => Result, (result) => result.resultImpactAreas)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => ClarisaImpactArea,
    (clarisaImpactArea) => clarisaImpactArea.resultImpactAreas,
  )
  @JoinColumn({ name: 'impact_area_id' })
  impact_area: ClarisaImpactArea;

  @ManyToOne(
    () => ImpactAreaScore,
    (impactAreaScore) => impactAreaScore.resultImpactAreas,
  )
  @JoinColumn({ name: 'impact_area_score_id' })
  impact_area_score: ImpactAreaScore;
}
