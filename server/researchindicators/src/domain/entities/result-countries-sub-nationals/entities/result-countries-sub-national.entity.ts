import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ClarisaSubNational } from '../../../tools/clarisa/entities/clarisa-sub-nationals/entities/clarisa-sub-national.entity';

@Entity('result_countries_sub_nationals')
export class ResultCountriesSubNational extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_country_sub_national_id',
    type: 'bigint',
  })
  result_country_sub_national_id!: number;

  @Column('bigint', {
    name: 'result_country_id',
    nullable: false,
  })
  result_country_id!: number;

  @Column('bigint', {
    name: 'sub_national_id',
    nullable: false,
  })
  sub_national_id!: number;

  @ManyToOne(
    () => ResultCountry,
    (result) => result.result_countries_sub_nationals,
  )
  @JoinColumn({ name: 'result_country_id' })
  result_country!: ResultCountry;

  @ManyToOne(
    () => ClarisaSubNational,
    (subNational) => subNational.result_countries_sub_nationals,
  )
  @JoinColumn({ name: 'sub_national_id' })
  sub_national!: ClarisaSubNational;
}
