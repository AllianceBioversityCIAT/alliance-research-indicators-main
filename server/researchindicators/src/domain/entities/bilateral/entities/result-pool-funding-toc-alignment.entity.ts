import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-05 / R-BIL-092, R-BIL-095
// Per-SP ToC alignment row (design §4). Snapshot columns freeze the upstream
// catalog values at save time (R-BIL-095); `unit_messurament` keeps the
// upstream spelling verbatim (D-V2-4). Partial-unique on the active row is
// enforced at the DB layer via a STORED GENERATED column `active_result_sp`
// + UNIQUE index `idx_rpfta_active_result_sp` (migration 1779190000015).
// The generated column is intentionally NOT mapped on the entity — TypeORM
// would otherwise try to write to it. Same pattern as
// `result_pool_funding_alignment` (migration 1779190000014, D-PI-9).
// No OpenSearch decoration — alignment rows are not searchable (design §8).
@Entity('result_pool_funding_toc_alignment')
@Index('idx_rpfta_result', ['result_id'])
export class ResultPoolFundingTocAlignment extends AuditableEntity {
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
    name: 'sp_code',
    length: 50,
    nullable: false,
  })
  sp_code!: string;

  @Column('boolean', {
    name: 'aligns_with_toc',
    nullable: false,
  })
  aligns_with_toc!: boolean;

  @Column('varchar', {
    name: 'level',
    length: 10,
    nullable: true,
  })
  level?: string;

  @Column('int', {
    name: 'toc_result_id',
    nullable: true,
  })
  toc_result_id?: number;

  @Column('int', {
    name: 'indicator_id',
    nullable: true,
  })
  indicator_id?: number;

  @Column('decimal', {
    name: 'quantitative_contribution',
    precision: 18,
    scale: 2,
    nullable: true,
  })
  quantitative_contribution?: number;

  @Column('text', {
    name: 'toc_result_title',
    nullable: true,
  })
  toc_result_title?: string;

  @Column('text', {
    name: 'indicator_description',
    nullable: true,
  })
  indicator_description?: string;

  @Column('varchar', {
    name: 'unit_messurament',
    length: 100,
    nullable: true,
  })
  unit_messurament?: string;

  @Column('varchar', {
    name: 'target_value',
    length: 50,
    nullable: true,
  })
  target_value?: string;

  @Column('int', {
    name: 'target_year',
    nullable: true,
  })
  target_year?: number;
}
