import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ClarisaInstitution } from '../../clarisa-institutions/entities/clarisa-institution.entity';
import { ResultInstitutionType } from '../../../../../entities/result-institution-types/entities/result-institution-type.entity';

@Entity('clarisa_institution_types')
export class ClarisaInstitutionType extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'code',
    nullable: false,
  })
  code!: number;

  @Column('text', {
    name: 'name',
    nullable: true,
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

  @OneToMany(
    () => ResultInstitutionType,
    (resultInstitutionType) => resultInstitutionType.institution_type,
  )
  result_institution_types?: ResultInstitutionType[];

  @OneToMany(
    () => ResultInstitutionType,
    (resultInstitutionType) => resultInstitutionType.sub_institution_type,
  )
  result_sub_institution_types?: ResultInstitutionType[];
}
