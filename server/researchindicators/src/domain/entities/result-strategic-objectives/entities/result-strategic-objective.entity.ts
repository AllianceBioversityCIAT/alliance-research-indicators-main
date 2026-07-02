import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { StrategicObjective } from '../../strategic-objectives/entities/strategic-objective.entity';
import { ResultStrategicObjectiveRoles } from './result-strategic-objective-roles.entity';

@Entity('result_strategic_objectives')
export class ResultStrategicObjective extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'strategic_objective_id',
  })
  strategic_objective_id: number;

  @Column({
    type: 'bigint',
    name: 'role_id',
  })
  role_id: number;

  @ManyToOne(() => Result, (result) => result.resultStrategicObjectives)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => StrategicObjective,
    (strategicObjective) => strategicObjective.resultStrategicObjectives,
  )
  @JoinColumn({ name: 'strategic_objective_id' })
  strategic_objective: StrategicObjective;

  @ManyToOne(
    () => ResultStrategicObjectiveRoles,
    (resultStrategicObjectiveRoles) =>
      resultStrategicObjectiveRoles.resultStrategicObjectives,
  )
  @JoinColumn({ name: 'role_id' })
  role: ResultStrategicObjectiveRoles;
}
