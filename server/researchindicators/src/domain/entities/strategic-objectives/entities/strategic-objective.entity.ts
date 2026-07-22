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
import { ResultStrategicObjective } from '../../result-strategic-objectives/entities/result-strategic-objective.entity';

@Entity('strategic_objectives')
export class StrategicObjective extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'portfolio_id',
    type: 'bigint',
    nullable: false,
  })
  portfolio_id!: number;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.strategic_objectives)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio;

  @OneToMany(
    () => ResultStrategicObjective,
    (resultStrategicObjective) => resultStrategicObjective.strategic_objective,
  )
  resultStrategicObjectives?: ResultStrategicObjective[];
}
