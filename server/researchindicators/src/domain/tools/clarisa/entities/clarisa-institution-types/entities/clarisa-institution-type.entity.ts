import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';

@Entity('clarisa_institution_types')
export class ClarisaInstitutionType extends AuditableEntity {
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
    name: 'description',
    nullable: true,
  })
  description!: string;

  @Column('bigint', {
    name: 'parent_code',
    nullable: true,
  })
  parent_code!: number;

  @ManyToOne(
    () => ClarisaInstitutionType,
    (clarisaInstitutionType) => clarisaInstitutionType.children,
  )
  @JoinColumn({ name: 'parent_code' })
  parent!: ClarisaInstitutionType;

  @OneToMany(
    () => ClarisaInstitutionType,
    (clarisaInstitutionType) => clarisaInstitutionType.parent,
  )
  children!: ClarisaInstitutionType[];

  @OneToMany(
    () => ClarisaInstitution,
    (clarisaInstitution) => clarisaInstitution.institution_type,
  )
  institutions!: ClarisaInstitution[];
}
