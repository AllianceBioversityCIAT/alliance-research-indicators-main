import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { MaturityLevel } from '../../maturity-level/entities/maturity-level.entity';

@Entity('result_oicrs')
export class ResultOicr extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'result_id',
    comment: 'The unique identifier for the result',
  })
  result_id: number;

  @Column({
    type: 'text',
    name: 'oicr_internal_code',
    comment: 'OICR internal code for the result',
    nullable: true,
  })
  oicr_internal_code: string;

  @Column({
    type: 'text',
    name: 'outcome_impact_statement',
    comment: 'Elaboration of outcome/impact statement',
    nullable: true,
  })
  outcome_impact_statement: string;

  @Column({
    type: 'text',
    name: 'short_outcome_impact_statement',
    comment: 'Short Outcome/Impact Statement',
    nullable: true,
  })
  short_outcome_impact_statement: string;

  @Column({
    type: 'text',
    name: 'general_comment',
    comment: 'General comment on the result',
    nullable: true,
  })
  general_comment: string;

  @Column({
    type: 'bigint',
    name: 'maturity_level_id',
    nullable: true,
  })
  maturity_level_id: number;

  @ManyToOne(() => MaturityLevel, (ml) => ml.result_oicr)
  @JoinColumn({
    name: 'maturity_level_id',
  })
  maturity_level: MaturityLevel;

  @ManyToOne(() => Result, (result) => result.result_oicrs)
  @JoinColumn({ name: 'result_id' })
  result: Result;
}
