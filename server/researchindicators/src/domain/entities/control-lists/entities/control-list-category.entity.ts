import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * A named group of lists (design.md §3). Categories are global: the name is
 * unique across the whole module (`uq_control_list_categories_name`, R-CLG-002).
 * `control_lists` FKs into this table; no relation is declared here.
 */
@Entity('control_list_categories')
export class ControlListCategory extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: String, name: 'name' })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @ApiPropertyOptional({ type: String, name: 'description' })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description?: string;

  @ApiProperty({ type: Number, name: 'display_order' })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  display_order: number;
}
