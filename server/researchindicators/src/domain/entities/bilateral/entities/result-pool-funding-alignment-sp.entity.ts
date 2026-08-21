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

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-03 / R-BIL-120, R-BIL-123
  // Domain 'PRIMARY' | 'CONTRIBUTING'. Nullable: legacy rows keep sp_role =
  // NULL (no backfill, R-BIL-126) meaning "role not yet chosen". No
  // @OpenSearchProperty — this entity is not reachable by the mapping
  // generator (it is not in the ResultOpensearchDto tree), so a decorator
  // here would be inert metadata that misleads the next reader (F-1).
  //
  // `active_primary_alignment` (the STORED GENERATED column added by the
  // same migration, 1786636994078) is deliberately NOT mapped here — TypeORM
  // would otherwise attempt to write a generated column.
  @Column('varchar', {
    name: 'sp_role',
    length: 20,
    nullable: true,
  })
  sp_role!: string | null;

  @ManyToOne(
    () => ResultPoolFundingAlignment,
    (alignment) => alignment.selected_sps,
  )
  @JoinColumn({ name: 'alignment_id' })
  alignment!: ResultPoolFundingAlignment;
}
