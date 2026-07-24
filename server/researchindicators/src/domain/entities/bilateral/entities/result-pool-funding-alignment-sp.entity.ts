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
// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.3 / R-BIL-073
// Column renamed from `lever_code` to `sp_code` (it always held a CGIAR
// Science Program code, never a Lever). API contract is preserved upstream
// via SQL alias in `result-pool-funding-alignment.repository.ts`.
@Index('idx_result_pool_funding_alignment_sp_sp', ['sp_code'])
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
    name: 'sp_code',
    length: 50,
    nullable: false,
  })
  @OpenSearchProperty({ type: 'keyword' })
  sp_code!: string;

  @ManyToOne(
    () => ResultPoolFundingAlignment,
    (alignment) => alignment.selected_sps,
  )
  @JoinColumn({ name: 'alignment_id' })
  alignment!: ResultPoolFundingAlignment;
}
