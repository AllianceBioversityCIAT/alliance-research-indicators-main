import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../../../../entities/result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('clarisa_innovation_characteristics')
export class ClarisaInnovationCharacteristic extends AuditableEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

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
    name: 'source_id',
    type: 'bigint',
    nullable: true,
  })
  source_id?: number;

  @OneToMany(
    () => ResultInnovationDev,
    (resultInnovationDev) => resultInnovationDev.innovationNature,
  )
  result_innovation_dev?: ResultInnovationDev[];
}
