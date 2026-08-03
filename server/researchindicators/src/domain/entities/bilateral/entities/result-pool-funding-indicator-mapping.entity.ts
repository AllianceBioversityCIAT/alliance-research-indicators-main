import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';
import { ResultKnowledgeProduct } from '../../result-knowledge-product/entities/result-knowledge-product.entity';
import { ResultPolicyChange } from '../../result-policy-change/entities/result-policy-change.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_pool_funding_indicator_mapping')
@Index('idx_rpfim_result', ['result_id'])
@Index('idx_rpfim_indicator', ['lever_code', 'indicator_code'])
@Index('idx_rpfim_stale', ['is_stale'])
@Index(
  'uq_rpfim_result_indicator_active',
  ['result_id', 'lever_code', 'indicator_code', 'is_active'],
  { unique: true },
)
export class ResultPoolFundingIndicatorMapping extends AuditableEntity {
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

  @Column('varchar', {
    name: 'lever_code',
    length: 50,
    nullable: false,
  })
  @OpenSearchProperty({ type: 'keyword' })
  lever_code!: string;

  @Column('varchar', {
    name: 'indicator_code',
    length: 100,
    nullable: false,
  })
  @OpenSearchProperty({ type: 'keyword' })
  indicator_code!: string;

  @Column('varchar', {
    name: 'indicator_type',
    length: 50,
    nullable: false,
  })
  @OpenSearchProperty({ type: 'keyword' })
  indicator_type!: string;

  @Column('bigint', {
    name: 'result_capacity_sharing_id',
    nullable: true,
  })
  result_capacity_sharing_id?: number;

  @Column('bigint', {
    name: 'result_knowledge_product_id',
    nullable: true,
  })
  result_knowledge_product_id?: number;

  @Column('bigint', {
    name: 'result_policy_change_id',
    nullable: true,
  })
  result_policy_change_id?: number;

  @Column('bigint', {
    name: 'result_innovation_dev_id',
    nullable: true,
  })
  result_innovation_dev_id?: number;

  @Column('text', {
    name: 'other_contribution_narrative',
    nullable: true,
  })
  other_contribution_narrative?: string;

  @Column('boolean', {
    name: 'is_stale',
    nullable: false,
    default: false,
  })
  @OpenSearchProperty({ type: 'boolean' })
  is_stale!: boolean;

  @ManyToOne(() => Result, (result) => result.pool_funding_indicator_mappings)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(
    () => ResultCapacitySharing,
    (resultCapacitySharing) =>
      resultCapacitySharing.pool_funding_indicator_mappings,
  )
  @JoinColumn({ name: 'result_capacity_sharing_id' })
  result_capacity_sharing?: ResultCapacitySharing;

  @ManyToOne(
    () => ResultKnowledgeProduct,
    (resultKnowledgeProduct) =>
      resultKnowledgeProduct.pool_funding_indicator_mappings,
  )
  @JoinColumn({ name: 'result_knowledge_product_id' })
  result_knowledge_product?: ResultKnowledgeProduct;

  @ManyToOne(
    () => ResultPolicyChange,
    (resultPolicyChange) => resultPolicyChange.pool_funding_indicator_mappings,
  )
  @JoinColumn({ name: 'result_policy_change_id' })
  result_policy_change?: ResultPolicyChange;

  @ManyToOne(
    () => ResultInnovationDev,
    (resultInnovationDev) =>
      resultInnovationDev.pool_funding_indicator_mappings,
  )
  @JoinColumn({ name: 'result_innovation_dev_id' })
  result_innovation_dev?: ResultInnovationDev;
}
