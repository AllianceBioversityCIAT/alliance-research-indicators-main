import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ResultPoolFundingIndicatorMapping } from '../../bilateral/entities/result-pool-funding-indicator-mapping.entity';

@Entity('result_knowledge_products')
export class ResultKnowledgeProduct extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'text',
    name: 'type',
    nullable: true,
  })
  type: string;

  @Column({
    type: 'text',
    name: 'citation',
    nullable: true,
  })
  citation: string;

  @Column({
    type: 'boolean',
    name: 'open_access',
    nullable: true,
  })
  open_access: boolean;

  @Column({
    type: 'text',
    name: 'access_status',
    nullable: true,
  })
  access_status: string;

  @Column({
    type: 'text',
    name: 'collection',
    nullable: true,
  })
  collection: string;

  @Column({
    type: 'text',
    name: 'publication_date',
    nullable: true,
  })
  publication_date: string;

  @ManyToOne(() => Result, (result) => result.knowledge_products)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @OneToMany(
    () => ResultPoolFundingIndicatorMapping,
    (mapping) => mapping.result_knowledge_product,
  )
  pool_funding_indicator_mappings?: ResultPoolFundingIndicatorMapping[];
}
