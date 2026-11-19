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
 * One institutional objective for a portfolio and year (design section 3.1,
 * R-STF-009). No owner column. The code is unique per portfolio and year.
 */
@Entity('institutional_objectives')
@Index('uq_iob_portfolio_year_code', ['portfolio_id', 'year', 'code'], {
  unique: true,
})
@Index('idx_iob_portfolio_year', ['portfolio_id', 'year'])
export class InstitutionalObjective extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @Column({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;

  @ApiProperty({ type: Number, name: 'year' })
  @Column({ name: 'year', type: 'smallint' })
  year: number;

  @ApiProperty({ type: String, name: 'code' })
  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @ApiProperty({ type: String, name: 'statement' })
  @Column({ name: 'statement', type: 'text' })
  statement: string;

  @ManyToOne(() => Portfolio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'portfolio_id',
    foreignKeyConstraintName: 'FK_institutional_objectives_portfolio_id',
  })
  portfolio?: Portfolio;
}
