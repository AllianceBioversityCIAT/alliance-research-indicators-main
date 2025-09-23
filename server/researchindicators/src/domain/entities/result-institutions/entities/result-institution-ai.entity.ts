import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { InstitutionRole } from '../../institution-roles/entities/institution-role.entity';

@Entity('result_institution_ai')
export class ResultInstitutionAi extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'institution_id',
    type: 'bigint',
  })
  institution_id: number;

  @Column({
    name: 'institution_role_id',
    type: 'bigint',
  })
  institution_role_id: number;

  @Column({
    name: 'institution_name',
    type: 'text',
  })
  institution_name: string;

  @Column({
    name: 'score',
    type: 'float',
  })
  score: number;

  @ManyToOne(() => Result, (result) => result.institutions_ai)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => InstitutionRole,
    (institutionRole) => institutionRole.result_institutions_ai,
  )
  @JoinColumn({ name: 'institution_role_id' })
  institution_role!: InstitutionRole;
}
