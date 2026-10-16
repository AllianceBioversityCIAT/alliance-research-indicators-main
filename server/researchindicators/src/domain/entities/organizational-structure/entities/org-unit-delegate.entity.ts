import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * One delegate of an entry: the CURRENT list, not versioned (R-ORG-017,
 * D-ORG-15). Only the staff `carnet` is stored. Unique on
 * `(org_unit_id, staff_carnet)`; foreign keys live in the migration.
 */
@Entity('org_unit_delegates')
export class OrgUnitDelegate extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'org_unit_id' })
  @Column({ name: 'org_unit_id', type: 'bigint' })
  org_unit_id: number;

  @ApiProperty({ type: String, name: 'staff_carnet' })
  @Column({ name: 'staff_carnet', type: 'varchar', length: 10 })
  staff_carnet: string;
}
