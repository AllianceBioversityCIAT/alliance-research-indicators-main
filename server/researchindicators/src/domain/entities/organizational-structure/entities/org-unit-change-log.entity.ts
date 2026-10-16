import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { OrgChangeAction } from '../organizational-structure.types';

/**
 * Append-only change log (R-ORG-009, NFR-ORG-003, D-ORG-5). `org_unit_id` has
 * NO foreign key so the rows survive a physical delete. `created_by` /
 * `created_at` are the who and when; the log is never updated.
 */
@Entity('org_unit_change_log')
export class OrgUnitChangeLog extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'org_unit_id' })
  @Column({ name: 'org_unit_id', type: 'bigint' })
  org_unit_id: number;

  @ApiProperty({ type: String, name: 'action' })
  @Column({
    name: 'action',
    type: 'enum',
    enum: [
      'seed',
      'create',
      'edit_in_place',
      'new_version',
      'inactivate',
      'reactivate',
      'delete_logical',
      'delete_physical',
      'code_change',
      'delegates_change',
    ],
  })
  action: OrgChangeAction;

  @ApiPropertyOptional({ type: Number, name: 'applies_from_year' })
  @Column({ name: 'applies_from_year', type: 'smallint', nullable: true })
  applies_from_year?: number | null;

  @ApiProperty({ type: Boolean, name: 'backdated' })
  @Column({ name: 'backdated', type: 'boolean', default: false })
  backdated: boolean;

  @ApiProperty({ type: Object, name: 'changes' })
  @Column({ name: 'changes', type: 'json' })
  changes: Record<string, { old: unknown; new: unknown }>;
}
