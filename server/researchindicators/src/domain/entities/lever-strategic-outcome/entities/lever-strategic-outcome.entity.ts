import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultLeverStrategicOutcome } from '../../result-lever-strategic-outcome/entities/result-lever-strategic-outcome.entity';

@Entity('lever_strategic_outcome')
export class LeverStrategicOutcome extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'lever_id',
    nullable: true,
  })
  lever_id: number;

  @Column({
    type: 'text',
    name: 'strategic_outcome',
    nullable: true,
  })
  strategic_outcome: string;

  @OneToMany(
    () => ResultLeverStrategicOutcome,
    (result_lever_strategic_outcome) =>
      result_lever_strategic_outcome.lever_strategic_outcome,
  )
  result_lever_strategic_outcomes: ResultLeverStrategicOutcome[];
}
