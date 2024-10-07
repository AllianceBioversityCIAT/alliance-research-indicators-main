import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';

@Entity('country_roles')
export class CountryRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'country_role_id',
    type: 'bigint',
  })
  country_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultCountry, (resultCountry) => resultCountry.country_role)
  result_countries!: ResultCountry[];
}
