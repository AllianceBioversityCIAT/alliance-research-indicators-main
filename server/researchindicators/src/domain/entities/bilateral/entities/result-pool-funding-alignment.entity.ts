import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ResultPoolFundingAlignmentSp } from './result-pool-funding-alignment-sp.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.17
// Partial-unique on the active row is enforced at the DB layer via a
// STORED GENERATED column `active_result_id` + a UNIQUE index on it
// (migration 1779190000014). The generated column is intentionally NOT
// mapped on the entity — TypeORM would otherwise try to write to it.
// Same pattern as `bilateral_project_mapping` (D-PI-9).
@Entity('result_pool_funding_alignment')
@Index('idx_result_pool_funding_alignment_result', ['result_id'])
export class ResultPoolFundingAlignment extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('boolean', {
    name: 'has_contribution',
    nullable: false,
  })
  has_contribution!: boolean;

  @ManyToOne(() => Result, (result) => result.pool_funding_alignments)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @OneToMany(
    () => ResultPoolFundingAlignmentSp,
    (alignmentSp) => alignmentSp.alignment,
  )
  selected_sps?: ResultPoolFundingAlignmentSp[];
}
