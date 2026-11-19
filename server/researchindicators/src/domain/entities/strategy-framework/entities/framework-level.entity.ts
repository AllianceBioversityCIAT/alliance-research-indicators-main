import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';

/**
 * One depth of a portfolio's strategy (design section 3.1, R-STF-002).
 * `indicator_portfolio_key` is a stored generated column: the portfolio id
 * only on the indicator level, so the unique index allows one such level.
 * `insert` and `update` are false so TypeORM never writes the column
 * (design section 2.1, P-35). Foreign key lives beside the column.
 */
@Entity('framework_levels')
@Index('uq_framework_levels_portfolio_depth', ['portfolio_id', 'depth'], {
  unique: true,
})
@Index('uq_framework_levels_indicator', ['indicator_portfolio_key'], {
  unique: true,
})
export class FrameworkLevel extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @Column({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;

  @ApiProperty({ type: Number, name: 'depth' })
  @Column({ name: 'depth', type: 'smallint' })
  depth: number;

  @ApiProperty({ type: String, name: 'name' })
  @Column({ name: 'name', type: 'varchar', length: 60 })
  name: string;

  @ApiProperty({ type: String, name: 'plural_name' })
  @Column({ name: 'plural_name', type: 'varchar', length: 60 })
  plural_name: string;

  @ApiProperty({ type: String, name: 'short_label' })
  @Column({ name: 'short_label', type: 'varchar', length: 20 })
  short_label: string;

  @ApiProperty({ type: Number, name: 'is_indicator_level' })
  @Column({ name: 'is_indicator_level', type: 'tinyint', default: 0 })
  is_indicator_level: number;

  @ApiProperty({
    type: Number,
    name: 'indicator_portfolio_key',
    required: false,
  })
  @Column({
    name: 'indicator_portfolio_key',
    type: 'bigint',
    nullable: true,
    generatedType: 'STORED',
    asExpression: 'IF(is_indicator_level = 1, portfolio_id, NULL)',
    insert: false,
    update: false,
  })
  indicator_portfolio_key?: number | null;

  @ManyToOne(() => Portfolio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'portfolio_id',
    foreignKeyConstraintName: 'FK_framework_levels_portfolio_id',
  })
  portfolio?: Portfolio;
}
