import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';
import { LeverStrategicOutcome } from '../../lever-strategic-outcome/entities/lever-strategic-outcome.entity';

@Entity('result_lever_strategic_outcome')
export class ResultLeverStrategicOutcome extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'result_lever_id',
    nullable: true,
  })
  result_lever_id: number;

  @Column({
    type: 'bigint',
    name: 'lever_strategic_outcome_id',
    nullable: true,
  })
  lever_strategic_outcome_id: number;

  @ManyToOne(
    () => ResultLever,
    (result_lever) => result_lever.result_lever_strategic_outcomes,
  )
  @JoinColumn({ name: 'result_lever_id' })
  result_lever: ResultLever;

  @ManyToOne(
    () => LeverStrategicOutcome,
    (lever_strategic_outcome) =>
      lever_strategic_outcome.result_lever_strategic_outcomes,
  )
  @JoinColumn({ name: 'lever_strategic_outcome_id' })
  lever_strategic_outcome: LeverStrategicOutcome;
}
