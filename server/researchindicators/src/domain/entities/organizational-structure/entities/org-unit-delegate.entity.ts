import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * One delegate of ONE VERSION of an entry (R-ORG-017, D-ORG-24: a versioned
 * field, like the director). Only the staff `carnet` is stored. Unique on
 * `(org_unit_version_id, staff_carnet)`; the foreign keys (version CASCADE,
 * staff RESTRICT) live in migration `1791000000005`, as for the other entities
 * of this module.
 */
@Entity('org_unit_delegates')
export class OrgUnitDelegate extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'org_unit_version_id' })
  @Column({ name: 'org_unit_version_id', type: 'bigint' })
  org_unit_version_id: number;

  @ApiProperty({ type: String, name: 'staff_carnet' })
  @Column({ name: 'staff_carnet', type: 'varchar', length: 10 })
  staff_carnet: string;
}
