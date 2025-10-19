import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultImpactArea } from '../../../../../entities/result-impact-areas/entities/result-impact-area.entity';

@Entity('clarisa_impact_areas')
export class ClarisaImpactArea extends AuditableEntity {
  @PrimaryColumn({ type: 'bigint', name: 'id' })
  id: number;

  @Column({ type: 'text', name: 'name', nullable: true })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description: string;

  @Column({ type: 'text', name: 'financial_code', nullable: true })
  financialCode: string;

  @Column({ type: 'text', name: 'icon', nullable: true })
  icon: string;

  @Column({ type: 'text', name: 'color', nullable: true })
  color: string;

  @OneToMany(() => ResultImpactArea, (ria) => ria.impact_area)
  resultImpactAreas: ResultImpactArea[];
}
