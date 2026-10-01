import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * A named group of lists within one portfolio (design.md §3).
 * `control_lists` (T-02) will FK into this table; no relation is declared
 * here yet because that table does not exist in this slice.
 */
@Entity('control_list_categories')
export class ControlListCategory extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @Column({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;

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
