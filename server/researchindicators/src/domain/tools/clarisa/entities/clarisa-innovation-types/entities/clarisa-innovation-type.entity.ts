import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../../../../entities/result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('clarisa_innovation_types')
export class ClarisaInnovationType extends AuditableEntity {
  @PrimaryColumn({
    name: 'code',
    type: 'bigint',
  })
  code: number;

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

  @OneToMany(
    () => ResultInnovationDev,
    (resultInnovationDev) => resultInnovationDev.innovationType,
  )
  result_innovation_dev?: ResultInnovationDev[];
}
