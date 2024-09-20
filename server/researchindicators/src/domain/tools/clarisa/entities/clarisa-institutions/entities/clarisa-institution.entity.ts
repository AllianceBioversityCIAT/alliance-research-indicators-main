import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ClarisaInstitutionType } from '../../clarisa-institution-types/entities/clarisa-institution-type.entity';
import { ResultInstitution } from '../../../../../entities/result-institutions/entities/result-institution.entity';

@Entity('clarisa_institutions')
export class ClarisaInstitution extends AuditableEntity {
  @Column('bigint', {
    name: 'code',
    primary: true,
    nullable: false,
  })
  code!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('text', {
    name: 'acronym',
    nullable: true,
  })
  acronym!: string;

  @Column('text', {
    name: 'websiteLink',
    nullable: true,
  })
  websiteLink!: string;

  @Column('timestamp', {
    name: 'added',
    nullable: false,
  })
  added!: Date;

  @Column('bigint', {
    name: 'institution_type_id',
    nullable: false,
  })
  institution_type_id!: number;

  @ManyToOne(
    () => ClarisaInstitutionType,
    (clarisaInstitutionType) => clarisaInstitutionType.institutions,
  )
  @JoinColumn({ name: 'institution_type_id' })
  institution_type!: ClarisaInstitutionType;

  @OneToMany(
    () => ResultInstitution,
    (resultInstitution) => resultInstitution.institution,
  )
  result_institutions!: ResultInstitution[];
}
