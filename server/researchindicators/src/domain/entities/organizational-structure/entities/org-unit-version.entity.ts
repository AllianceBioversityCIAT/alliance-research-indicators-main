import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * One version of an entry over the half-open year range
 * `[valid_from_year, valid_to_year)`, `NULL` = open-ended (design.md 3.1,
 * R-ORG-004). Unique on `(org_unit_id, valid_from_year)`. The director is
 * stored as the staff `carnet` only (R-ORG-016, D-ORG-9); name and email are
 * joined on read. Foreign keys live in the migration.
 */
@Entity('org_unit_versions')
export class OrgUnitVersion extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'org_unit_id' })
  @Column({ name: 'org_unit_id', type: 'bigint' })
  org_unit_id: number;

  @ApiProperty({ type: Number, name: 'valid_from_year' })
  @Column({ name: 'valid_from_year', type: 'smallint' })
  valid_from_year: number;

  @ApiPropertyOptional({ type: Number, name: 'valid_to_year' })
  @Column({ name: 'valid_to_year', type: 'smallint', nullable: true })
  valid_to_year?: number | null;

  @ApiProperty({ type: String, name: 'name' })
  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ type: String, name: 'acronym' })
  @Column({ name: 'acronym', type: 'varchar', length: 50, nullable: true })
  acronym?: string | null;

  @ApiProperty({ type: Number, name: 'level_value_id' })
  @Column({ name: 'level_value_id', type: 'bigint' })
  level_value_id: number;

  @ApiPropertyOptional({ type: Number, name: 'parent_id' })
  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parent_id?: number | null;

  @ApiPropertyOptional({ type: String, name: 'director_carnet' })
  @Column({
    name: 'director_carnet',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  director_carnet?: string | null;
}
