import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInstitutionType } from '../../../tools/clarisa/entities/clarisa-institution-types/entities/clarisa-institution-type.entity';
import { InstitutionTypeRole } from '../../institution-type-roles/entities/institution-type-role.entity';
import { ClarisaInstitution } from '../../../tools/clarisa/entities/clarisa-institutions/entities/clarisa-institution.entity';

@Entity('result_institution_types')
export class ResultInstitutionType extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_institution_type_id',
    type: 'bigint',
  })
  result_institution_type_id!: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id!: number;

  @Column({
    name: 'institution_type_id',
    type: 'bigint',
    nullable: false,
  })
  institution_type_id!: number;

  @Column({
    name: 'sub_institution_type_id',
    type: 'bigint',
    nullable: true,
  })
  sub_institution_type_id!: number;

  @Column({
    name: 'institution_type_custom_name',
    type: 'text',
    nullable: true,
  })
  institution_type_custom_name?: string;

  @Column({
    name: 'institution_type_role_id',
    type: 'bigint',
    nullable: false,
  })
  institution_type_role_id!: number;

  @Column({
    name: 'is_organization_known',
    type: 'boolean',
    nullable: true,
  })
  is_organization_known?: boolean;

  @Column({
    name: 'institution_id',
    type: 'bigint',
    nullable: true,
  })
  institution_id?: number;

  @ManyToOne(
    () => ClarisaInstitution,
    (institution) => institution.result_institution_types,
  )
  @JoinColumn({
    name: 'institution_id',
  })
  institution?: ClarisaInstitution;

  @ManyToOne(() => Result, (result) => result.result_institution_types)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;

  @ManyToOne(
    () => ClarisaInstitutionType,
    (institutionType) => institutionType.result_institution_types,
  )
  @JoinColumn({
    name: 'institution_type_id',
  })
  institution_type?: ClarisaInstitutionType;

  @ManyToOne(
    () => ClarisaInstitutionType,
    (institutionType) => institutionType.result_sub_institution_types,
  )
  @JoinColumn({
    name: 'sub_institution_type_id',
  })
  sub_institution_type?: ClarisaInstitutionType;

  @ManyToOne(
    () => InstitutionTypeRole,
    (institutionTypeRole) => institutionTypeRole.result_institution_types,
  )
  @JoinColumn({
    name: 'institution_type_role_id',
  })
  institution_type_role?: InstitutionTypeRole;
}
