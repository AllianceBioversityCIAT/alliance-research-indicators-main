import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultRegion } from '../../../../../entities/result-regions/entities/result-region.entity';

@Entity('clarisa_regions')
export class ClarisaRegion extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'um49Code',
    nullable: false,
  })
  um49Code!: number;

  @Column('text', {
    name: 'name',
    nullable: true,
  })
  name!: string;

  @OneToMany(() => ResultRegion, (resultRegion) => resultRegion.region)
  result_regions!: ResultRegion[];
}
