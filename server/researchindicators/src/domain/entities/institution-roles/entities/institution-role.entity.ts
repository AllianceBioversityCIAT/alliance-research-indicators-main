import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInstitution } from '../../result-institutions/entities/result-institution.entity';
import { ResultInstitutionAi } from '../../result-institutions/entities/result-institution-ai.entity';

@Entity('institution_roles')
export class InstitutionRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'institution_role_id',
    type: 'bigint',
  })
  institution_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultInstitution,
    (resultInstitution) => resultInstitution.institution_role,
  )
  result_institutions!: ResultInstitution[];

  @OneToMany(
    () => ResultInstitutionAi,
    (resultInstitutionAi) => resultInstitutionAi.institution_role,
  )
  result_institutions_ai!: ResultInstitutionAi[];
}
