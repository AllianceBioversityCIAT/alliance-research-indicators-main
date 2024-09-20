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

@Entity('result_institutions')
export class ResultInstitution extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_institution_id',
    type: 'bigint',
  })
  result_institution_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'institution_id',
    nullable: false,
  })
  institution_id!: number;

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
