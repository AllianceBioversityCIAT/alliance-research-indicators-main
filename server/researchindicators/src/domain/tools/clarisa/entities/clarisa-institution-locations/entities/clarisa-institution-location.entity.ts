import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';
import { ClarisaCountry } from '../../clarisa-countries/entities/clarisa-country.entity';

@Entity('clarisa_institution_locations')
export class ClarisaInstitutionLocation {
  @PrimaryColumn('bigint', {
    name: 'code',
  })
  code!: number;

  @Column('text', {
    name: 'name',
    nullable: true,
  })
  name!: string;

  @Column('bigint', {
    name: 'institution_id',
    nullable: false,
  })
  institution_id!: number;

  @Column('varchar', {
    length: 3,
    name: 'isoAlpha2',
    nullable: false,
  })
  isoAlpha2!: string;

  @Column('boolean', {
    name: 'isHeadquarter',
    nullable: true,
  })
  isHeadquarter!: boolean;

  @ManyToOne(
    () => ClarisaInstitution,
    (clarisaInstitution) => clarisaInstitution.institution_locations,
  )
  @JoinColumn({ name: 'institution_id' })
  institution!: ClarisaInstitution;

  @ManyToOne(
    () => ClarisaCountry,
    (clarisaCountry) => clarisaCountry.institution_locations,
  )
  @JoinColumn({ name: 'isoAlpha2' })
  country!: ClarisaCountry;
}
