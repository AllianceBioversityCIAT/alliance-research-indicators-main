import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInstitution } from '../../../tools/clarisa/entities/clarisa-institutions/entities/clarisa-institution.entity';
import { InstitutionRole } from '../../institution-roles/entities/institution-role.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_institutions')
export class ResultInstitution extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_institution_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_institution_id',
    type: 'bigint',
  })
  result_institution_id!: number;

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
    type: Number,
    name: 'institution_id',
  })
  @Column('bigint', {
    name: 'institution_id',
    nullable: false,
  })
  institution_id!: number;

  @ApiProperty({
    type: Number,
    name: 'institution_role_id',
  })
  @Column('bigint', {
    name: 'institution_role_id',
    nullable: false,
  })
  institution_role_id!: number;

  @ManyToOne(
    () => InstitutionRole,
    (institutionRole) => institutionRole.result_institutions,
  )
  @JoinColumn({ name: 'institution_role_id' })
  institution_role!: InstitutionRole;

  @ManyToOne(() => Result, (result) => result.result_institutions)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(
    () => ClarisaInstitution,
    (institution) => institution.result_institutions,
  )
  @JoinColumn({ name: 'institution_id' })
  institution!: ClarisaInstitution;
}
