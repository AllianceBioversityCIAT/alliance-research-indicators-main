import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 / R-BIL-079
//
// Owns the join between an AGRESSO bilateral contract and a CLARISA bilateral project.
// Admin-maintained (see /admin/bilateral-project-mappings, T-15.15) — no upstream
// join field exists per D-PI-8. Soft-delete via `is_active` from AuditableEntity.
//
// Partial-uniqueness "(agresso_agreement_id) WHERE is_active = true" is enforced
// by a MySQL generated column + unique index defined in the matching migration
// (D-PI-9). The generated column is intentionally NOT mapped here; TypeORM
// would otherwise try to write to it.
@Entity('bilateral_project_mapping')
@Index('idx_bpm_agreement', ['agresso_agreement_id'])
@Index('idx_bpm_clarisa_project', ['clarisa_project_id'])
export class BilateralProjectMapping extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: number;

  @Column('varchar', {
    name: 'agresso_agreement_id',
    length: 50,
    nullable: false,
    comment: 'FK-by-value to agresso_contract.agreement_id',
  })
  agresso_agreement_id!: string;

  @Column('int', {
    name: 'clarisa_project_id',
    nullable: false,
    comment: 'Upstream CLARISA project.id',
  })
  clarisa_project_id!: number;

  @Column('varchar', {
    name: 'clarisa_project_short_name',
    length: 500,
    nullable: true,
    comment: 'Snapshot of CLARISA short_name at mapping time (D-PI-11)',
  })
  clarisa_project_short_name?: string | null;

  @Column({
    name: 'source',
    type: 'enum',
    enum: MappingSourceEnum,
    default: MappingSourceEnum.MANUAL,
    nullable: false,
  })
  source!: MappingSourceEnum;

  @Column('float', {
    name: 'confidence_score',
    nullable: true,
    comment: 'Populated only when source != MANUAL',
  })
  confidence_score?: number | null;

  @Column('text', {
    name: 'notes',
    nullable: true,
  })
  notes?: string | null;
}
