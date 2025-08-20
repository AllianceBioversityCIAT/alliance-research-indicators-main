import { Column, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

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
}
