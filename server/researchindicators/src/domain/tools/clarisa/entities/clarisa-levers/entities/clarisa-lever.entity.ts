import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { ResultLever } from '../../../../../entities/result-levers/entities/result-lever.entity';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { LeverSdgTarget } from '../../../../../entities/lever-sdg-targets/entities/lever-sdg-target.entity';
import { Portfolio } from '../../../../../entities/portfolios/entities/portfolio.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('clarisa_levers')
export class ClarisaLever extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'id',
  })
  @PrimaryColumn('bigint', {
    name: 'id',
    nullable: false,
  })
  id!: number;

  @ApiProperty({
    type: String,
    name: 'short_name',
  })
  @Column('text', {
    name: 'short_name',
    nullable: false,
  })
  short_name!: string;

  @ApiProperty({
    type: String,
    name: 'full_name',
  })
  @Column('text', {
    name: 'full_name',
    nullable: true,
  })
  full_name?: string;

  @ApiProperty({
    type: String,
    name: 'other_names',
  })
  @Column('text', {
    name: 'other_names',
    nullable: true,
  })
  other_names?: string;

  @ApiProperty({
    type: Number,
    name: 'portfolio_id',
  })
  @Column('bigint', {
    name: 'portfolio_id',
    nullable: true,
  })
  portfolio_id?: number;

  @ManyToOne(() => Portfolio, (portfolio) => portfolio.clarisa_levers)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio!: Portfolio;

  @OneToMany(() => ResultLever, (resultLever) => resultLever.lever)
  result_levers!: ResultLever[];

  @OneToMany(() => LeverSdgTarget, (leverSdgTarget) => leverSdgTarget.lever)
  lever_sdg_targets: LeverSdgTarget[];
}
