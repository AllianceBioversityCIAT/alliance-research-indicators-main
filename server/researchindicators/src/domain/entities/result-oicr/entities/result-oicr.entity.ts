import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

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
    name: 'outcome_impact_statement',
    comment: 'Elaboration of outcome/impact statement',
    nullable: true,
  })
  outcome_impact_statement: string;

  @Column({
    type: 'text',
    name: 'general_comment',
    comment: 'General comment on the result',
    nullable: true,
  })
  general_comment: string;

  @ManyToOne(() => Result, (result) => result.result_oicrs)
  @JoinColumn({ name: 'result_id' })
  result: Result;
}
