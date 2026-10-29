// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-01 / DD-1
//
// Read-only archive of superseded bilateral_project_mapping rows. The
// annualize migration is the only writer. There is no API, repository, or
// controller. original_id is the mapping row id at archive time. down()
// inserts it back as bilateral_project_mapping.id.
//
// The generated column active_agreement_id is not stored. It is derivable
// from is_active and agresso_agreement_id, and down() recreates it.
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { MappingSourceEnum } from '../enum/mapping-source.enum';

@Entity('bilateral_project_mapping_history')
export class BilateralProjectMappingHistory extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: number;

  @Column('bigint', {
    name: 'original_id',
    nullable: false,
  })
  original_id!: number;

  @Column('varchar', {
    name: 'agresso_agreement_id',
    length: 50,
    nullable: false,
  })
  agresso_agreement_id!: string;

  @Column('int', {
    name: 'reporting_year',
    nullable: false,
  })
  reporting_year!: number;

  @Column('int', {
    name: 'clarisa_project_id',
    nullable: false,
  })
  clarisa_project_id!: number;

  @Column('varchar', {
    name: 'clarisa_project_short_name',
    length: 500,
    nullable: true,
  })
  clarisa_project_short_name?: string | null;

  @Column('varchar', {
    name: 'clarisa_external_code',
    length: 100,
    nullable: true,
  })
  clarisa_external_code?: string | null;

  @Column({
    name: 'source',
    type: 'enum',
    enum: MappingSourceEnum,
    nullable: false,
  })
  source!: MappingSourceEnum;

  @Column('float', {
    name: 'confidence_score',
    nullable: true,
  })
  confidence_score?: number | null;

  @Column('text', {
    name: 'notes',
    nullable: true,
  })
  notes?: string | null;

  @Column({
    name: 'archived_at',
    type: 'timestamp',
    precision: 6,
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  archived_at!: Date;

  @Column('varchar', {
    name: 'archive_reason',
    length: 64,
    nullable: false,
  })
  archive_reason!: string;
}
