import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaCountry } from '../../../tools/clarisa/entities/clarisa-countries/entities/clarisa-country.entity';
import { ResultCountriesSubNational } from '../../result-countries-sub-nationals/entities/result-countries-sub-national.entity';
import { CountryRole } from '../../country-roles/entities/country-role.entity';

@Entity('result_countries')
export class ResultCountry extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_country_id',
    type: 'bigint',
  })
  result_country_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'country_id',
    nullable: false,
  })
  country_id!: number;

  @Column('bigint', {
    name: 'country_role_id',
    nullable: false,
  })
  country_role_id!: number;

  @ManyToOne(() => CountryRole, (countryRole) => countryRole.result_countries)
  @JoinColumn({ name: 'country_role_id' })
  country_role!: CountryRole;

  @ManyToOne(() => Result, (result) => result.result_countries)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => ClarisaCountry, (country) => country.result_countries)
  @JoinColumn({ name: 'country_id' })
  country!: ClarisaCountry;

  @OneToMany(
    () => ResultCountriesSubNational,
    (resultCountrySubNational) => resultCountrySubNational.result_country,
  )
  result_countries_sub_nationals!: ResultCountriesSubNational[];
}
