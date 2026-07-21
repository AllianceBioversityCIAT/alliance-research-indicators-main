import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultImpactOutcome } from './result-impact-outcome.entity';

@Entity('result_impact_outcome_roles')
export class ResultImpactOutcomeRoles extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @OneToMany(
    () => ResultImpactOutcome,
    (resultImpactOutcome) => resultImpactOutcome.role,
  )
  resultImpactOutcomes: ResultImpactOutcome[];
}
