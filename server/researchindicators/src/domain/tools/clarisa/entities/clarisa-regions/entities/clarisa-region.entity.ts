import { Column, Entity, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultRegion } from '../../../../../entities/result-regions/entities/result-region.entity';

@Entity('clarisa_regions')
export class ClarisaRegion extends AuditableEntity {
  @Column('bigint', {
    name: 'um49Code',
    primary: true,
    nullable: false,
  })
  um49Code!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultRegion, (resultRegion) => resultRegion.region)
  result_regions!: ResultRegion[];
}
