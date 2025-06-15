import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInstitutionType } from '../../result-institution-types/entities/result-institution-type.entity';

@Entity('institution_type_roles')
export class InstitutionTypeRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'institution_type_role_id',
    type: 'bigint',
  })
  institution_type_role_id!: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultInstitutionType,
    (resultInstitutionType) => resultInstitutionType.institution_type_role,
  )
  result_institution_types!: ResultInstitutionType[];
}
