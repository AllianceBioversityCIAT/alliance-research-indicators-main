import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultImpactArea } from '../../result-impact-areas/entities/result-impact-area.entity';

@Entity('impact_area_scores')
export class ImpactAreaScore extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @OneToMany(() => ResultImpactArea, (ria) => ria.impact_area_score)
  resultImpactAreas: ResultImpactArea[];
}
