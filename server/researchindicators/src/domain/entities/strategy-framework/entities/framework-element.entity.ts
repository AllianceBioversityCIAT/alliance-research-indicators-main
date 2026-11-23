import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { FrameworkLevel } from './framework-level.entity';

/**
 * One element at any depth (design section 3.1, R-STF-003). `portfolio_id`
 * is stored on every row so a code is unique per portfolio. `parent_id` is
 * null only at depth 1; the self foreign key is RESTRICT.
 */
@Entity('framework_elements')
@Index('uq_framework_elements_portfolio_code', ['portfolio_id', 'code'], {
  unique: true,
})
@Index('idx_framework_elements_parent', ['parent_id'])
@Index('idx_framework_elements_level', ['level_id'])
export class FrameworkElement extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @Column({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;

  @ApiProperty({ type: Number, name: 'level_id' })
  @Column({ name: 'level_id', type: 'bigint' })
  level_id: number;

  @ApiPropertyOptional({ type: Number, name: 'parent_id' })
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parent_id?: number | null;

  @ApiProperty({ type: String, name: 'code' })
  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @ApiProperty({ type: String, name: 'name' })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ type: String, name: 'description' })
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => Portfolio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'portfolio_id',
    foreignKeyConstraintName: 'FK_framework_elements_portfolio_id',
  })
  portfolio?: Portfolio;

  @ManyToOne(() => FrameworkLevel, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'level_id',
    foreignKeyConstraintName: 'FK_framework_elements_level_id',
  })
  level?: FrameworkLevel;

  @ManyToOne(() => FrameworkElement, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'parent_id',
    foreignKeyConstraintName: 'FK_framework_elements_parent_id',
  })
  parent?: FrameworkElement | null;
}
