import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 / R-BIL-079
// [SPEC bilateral/clarisa-project-automapping] — DD-8 (supersedes D-PI-8)
//
// Owns the join between an AGRESSO bilateral contract and a CLARISA bilateral project.
// Admin-maintained (see /admin/bilateral-project-mappings, T-15.15). Upstream join
// field `external_code` is now published by CLARISA (see DD-8 in
// docs/specs/bilateral/clarisa-project-automapping superseding archived D-PI-8,
// which is preserved as a point-in-time record). Soft-delete via `is_active`
// from AuditableEntity.
//
// Uniqueness is one row per (agresso_agreement_id, reporting_year), whether
// the row is active or inactive, via UNIQUE index uk_bpm_agreement_year.
// Migration annualizeBilateralProjectMapping drops the generated column
// active_agreement_id and uk_bpm_active_agreement (D-PI-9). That generated
// column stays unmapped. TypeORM would try to write it.
@Entity('bilateral_project_mapping')
@Index('idx_bpm_agreement', ['agresso_agreement_id'])
@Index('idx_bpm_clarisa_project', ['clarisa_project_id'])
@Index('idx_bpm_clarisa_external_code', ['clarisa_external_code'])
@Index('uk_bpm_agreement_year', ['agresso_agreement_id', 'reporting_year'], {
  unique: true,
})
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
    name: 'reporting_year',
    nullable: false,
    comment:
      'Reporting year of this mapping. Writers set it explicitly. There is no database default.',
  })
  reporting_year!: number;

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

  @Column('varchar', {
    name: 'clarisa_external_code',
    length: 100,
    nullable: true,
    comment: 'Normalized CLARISA external_code; feed-stable resolution key',
  })
  clarisa_external_code?: string | null;

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

  @Column('text', {
    name: 'status_justification',
    nullable: true,
    comment:
      'Last inactivation justification. Overwritten on each deactivate. Independent of notes.',
  })
  status_justification?: string | null;
}
