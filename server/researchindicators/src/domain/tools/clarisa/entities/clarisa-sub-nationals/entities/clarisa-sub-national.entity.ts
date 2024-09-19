import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_sub_nationals')
export class ClarisaSubNational extends AuditableEntity {
  @Column('bigint', {
    name: 'id',
    primary: true,
    nullable: false,
  })
  id!: number;

  @Column('text', {
    name: 'code',
    nullable: false,
  })
  code!: string;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('varchar', {
    length: 3,
    name: 'definition',
    nullable: true,
  })
  country_iso_alpha_2?: string;

  @Column('varchar', {
    length: 3,
    name: 'language_iso_2',
    nullable: true,
  })
  language_iso_2?: string;
}
