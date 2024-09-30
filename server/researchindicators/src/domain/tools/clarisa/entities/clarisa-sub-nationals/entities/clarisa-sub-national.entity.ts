import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultCountriesSubNational } from '../../../../../entities/result-countries-sub-nationals/entities/result-countries-sub-national.entity';

@Entity('clarisa_sub_nationals')
export class ClarisaSubNational extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'id',
    nullable: false,
  })
  id!: number;

  @Column('text', {
    name: 'code',
    nullable: true,
  })
  code!: string;

  @Column('text', {
    name: 'name',
    nullable: true,
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

  @OneToMany(
    () => ResultCountriesSubNational,
    (resultCountrySubNational) => resultCountrySubNational.sub_national,
  )
  result_countries_sub_nationals!: ResultCountriesSubNational[];
}
