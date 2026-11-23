import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * One entry in a list (design.md §3). `id` is the value's PERMANENT
 * reference (D-CTL-14): shown read-only in the table and the modal, and
 * never accepted in an update body — `UpdateControlListValueDto` does not
 * whitelist it, so `ValidationPipe({ forbidNonWhitelisted: true })` turns
 * any attempt to send it into a 400 before the service ever runs.
 *
 * "Active" is the inherited `is_active` from `AuditableEntity` (D-CTL-4) —
 * no separate column. Deletes are physical (D-CTL-5), so this table has no
 * soft-deleted rows to collide with its unique indexes.
 */
@Entity('control_list_values')
export class ControlListValue extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'list_id' })
  @Column({ name: 'list_id', type: 'bigint' })
  list_id: number;

  @ApiProperty({ type: String, name: 'code' })
  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @ApiProperty({ type: String, name: 'value' })
  @Column({ name: 'value', type: 'varchar', length: 150 })
  value: string;

  @ApiPropertyOptional({ type: String, name: 'description' })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description?: string;

  @ApiProperty({ type: Number, name: 'display_order' })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  display_order: number;
}
