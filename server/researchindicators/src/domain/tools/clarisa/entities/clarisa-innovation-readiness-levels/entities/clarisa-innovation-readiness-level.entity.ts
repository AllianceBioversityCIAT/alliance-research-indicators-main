import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../../../../entities/result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('clarisa_innovation_readiness_levels')
export class ClarisaInnovationReadinessLevel extends AuditableEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'level',
    type: 'bigint',
    nullable: true,
  })
  level?: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name?: string;

  @Column({
    name: 'definition',
    type: 'text',
    nullable: true,
  })
  definition?: string;

  @Column({
    name: 'additional_guidance',
    type: 'text',
    nullable: true,
  })
  additional_guidance?: string;

  @OneToMany(
    () => ResultInnovationDev,
    (resultInnovationDev) => resultInnovationDev.innovationReadiness,
  )
  result_innovation_dev?: ResultInnovationDev[];
}
