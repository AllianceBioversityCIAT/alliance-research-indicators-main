import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { ResultImpactOutcome } from '../../result-impact-outcomes/entities/result-impact-outcome.entity';

@Entity('impact_outcomes')
export class ImpactOutcome extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
  })
  description?: string;

  @Column({
    type: 'bigint',
    name: 'portfolio_id',
    nullable: false,
  })
  portfolio_id!: number;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.impact_outcomes)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio?: Portfolio;

  @OneToMany(
    () => ResultImpactOutcome,
    (resultImpactOutcome) => resultImpactOutcome.impact_outcome,
  )
  resultImpactOutcomes?: ResultImpactOutcome[];
}
