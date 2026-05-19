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
import { ResultPoolFundingAlignment } from './result-pool-funding-alignment.entity';

@Entity('result_pool_funding_alignment_sp')
@Index('idx_result_pool_funding_alignment_sp_alignment', ['alignment_id'])
@Index('idx_result_pool_funding_alignment_sp_lever', ['lever_code'])
export class ResultPoolFundingAlignmentSp extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('bigint', {
    name: 'alignment_id',
    nullable: false,
  })
  alignment_id!: number;

  @Column('varchar', {
    name: 'lever_code',
    length: 50,
    nullable: false,
  })
  @OpenSearchProperty({ type: 'keyword' })
  lever_code!: string;

  @ManyToOne(
    () => ResultPoolFundingAlignment,
    (alignment) => alignment.selected_sps,
  )
  @JoinColumn({ name: 'alignment_id' })
  alignment!: ResultPoolFundingAlignment;
}
