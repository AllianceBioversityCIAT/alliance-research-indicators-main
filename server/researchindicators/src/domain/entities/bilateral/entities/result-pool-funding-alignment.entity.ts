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

@Entity('result_pool_funding_alignment')
@Index('idx_result_pool_funding_alignment_result', ['result_id'])
@Index(
  'uq_result_pool_funding_alignment_result_active',
  ['result_id', 'is_active'],
  {
    unique: true,
  },
)
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
