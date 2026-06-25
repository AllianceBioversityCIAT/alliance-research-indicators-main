import { ApiProperty } from '@nestjs/swagger';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaLever } from '../../../tools/clarisa/entities/clarisa-levers/entities/clarisa-lever.entity';
import { StrategicObjective } from '../../strategic-objectives/entities/strategic-objective.entity';
import { ImpactOutcome } from '../../impact-outcomes/entities/impact-outcome.entity';

@Entity('portfolios')
export class Portfolio extends AuditableEntity {
  @ApiProperty({
    type: String,
    name: 'id',
  })
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @ApiProperty({
    type: String,
    name: 'name',
  })
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
  })
  name: string;

  @ApiProperty({
    type: String,
    name: 'description',
  })
  @Column({
    name: 'description',
    type: 'text',
  })
  description: string;

  @ApiProperty({
    type: Number,
    name: 'start_year',
  })
  @Column({
    name: 'start_year',
    type: 'int',
  })
  start_year: number;

  @ApiProperty({
    type: Number,
    name: 'end_year',
  })
  @Column({
    name: 'end_year',
    type: 'int',
  })
  end_year: number;

  @OneToMany(
    () => StrategicObjective,
    (strategicObjective) => strategicObjective.portfolio,
  )
  strategic_objectives?: StrategicObjective[];

  @OneToMany(() => ClarisaLever, (clarisaLever) => clarisaLever.portfolio)
  clarisa_levers?: ClarisaLever[];

  @OneToMany(() => ImpactOutcome, (impactOutcome) => impactOutcome.portfolio)
  impact_outcomes?: ImpactOutcome[];
}
