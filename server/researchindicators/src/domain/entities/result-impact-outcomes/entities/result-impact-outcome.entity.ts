import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ImpactOutcome } from '../../impact-outcomes/entities/impact-outcome.entity';
import { ResultImpactOutcomeRoles } from './result-impact-outcome-roles.entity';

@Entity('result_impact_outcomes')
export class ResultImpactOutcome extends AuditableEntity {
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
    name: 'impact_outcome_id',
  })
  impact_outcome_id: number;

  @Column({
    type: 'bigint',
    name: 'roles_id',
  })
  role_id: number;

  @ManyToOne(() => Result, (result) => result.resultImpactOutcomes)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => ImpactOutcome,
    (impactOutcome) => impactOutcome.resultImpactOutcomes,
  )
  @JoinColumn({ name: 'impact_outcome_id' })
  impact_outcome: ImpactOutcome;

  @ManyToOne(
    () => ResultImpactOutcomeRoles,
    (resultImpactOutcomeRoles) => resultImpactOutcomeRoles.resultImpactOutcomes,
  )
  @JoinColumn({ name: 'role_id' })
  role: ResultImpactOutcomeRoles;
}
