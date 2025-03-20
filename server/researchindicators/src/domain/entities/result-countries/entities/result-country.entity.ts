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
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_countries')
export class ResultCountry extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_country_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_country_id',
    type: 'bigint',
  })
  result_country_id!: number;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @ApiProperty({
    type: String,
    name: 'isoAlpha2',
    required: true,
  })
  @Column('varchar', {
    length: 3,
    name: 'isoAlpha2',
    nullable: false,
  })
  isoAlpha2!: string;

  @ApiProperty({
    type: Number,
    name: 'country_role_id',
  })
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
  @JoinColumn({ name: 'isoAlpha2' })
  country!: ClarisaCountry;

  @ApiProperty({
    type: ResultCountriesSubNational,
    isArray: true,
  })
  @OneToMany(
    () => ResultCountriesSubNational,
    (resultCountrySubNational) => resultCountrySubNational.result_country,
  )
  result_countries_sub_nationals!: ResultCountriesSubNational[];
}
