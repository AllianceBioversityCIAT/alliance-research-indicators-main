import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

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
}
