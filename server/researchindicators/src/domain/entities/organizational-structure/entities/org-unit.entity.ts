import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { OrgUnitStatus } from '../organizational-structure.types';

/**
 * One entry of the global organizational structure (design.md section 3.1).
 * `id` is the PERMANENT reference other modules store; `code` is editable
 * and unique (a deleted entry keeps owning it). No `portfolio_id`
 * (R-ORG-001). The versioned fields live in `org_unit_versions`.
 * The foreign key (`successor_id`, RESTRICT) lives in the migration.
 */
@Entity('org_units')
export class OrgUnit extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: String, name: 'code' })
  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @ApiProperty({ enum: ['active', 'inactive', 'deleted'], name: 'status' })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
  })
  status: OrgUnitStatus;

  @ApiPropertyOptional({ type: Number, name: 'status_from_year' })
  @Column({ name: 'status_from_year', type: 'smallint', nullable: true })
  status_from_year?: number | null;

  @ApiPropertyOptional({ type: Number, name: 'successor_id' })
  @Column({ name: 'successor_id', type: 'bigint', nullable: true })
  successor_id?: number | null;
}
