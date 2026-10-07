import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * A named set of values within one portfolio, identified by an immutable
 * system key (design.md §3). `control_list_values` (T-03) will FK into this
 * table; no relation is declared here yet because that table does not
 * exist in this slice.
 */
@Entity('control_lists')
export class ControlList extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'portfolio_id' })
  @Column({ name: 'portfolio_id', type: 'bigint' })
  portfolio_id: number;

  @ApiProperty({ type: Number, name: 'category_id' })
  @Column({ name: 'category_id', type: 'bigint' })
  category_id: number;

  // Immutable after creation (R-CTL-003): the update DTO never carries this
  // field, so ValidationPipe({ forbidNonWhitelisted: true }) rejects any
  // attempt to change it with a 400 before the service is ever called.
  @ApiProperty({ type: String, name: 'list_key' })
  @Column({ name: 'list_key', type: 'varchar', length: 100 })
  list_key: string;

  @ApiProperty({ type: String, name: 'name' })
  @Column({ name: 'name', type: 'varchar', length: 150 })
  name: string;

  @ApiPropertyOptional({ type: String, name: 'description' })
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description?: string;

  @ApiProperty({ type: String, name: 'code_prefix' })
  @Column({ name: 'code_prefix', type: 'varchar', length: 10 })
  code_prefix: string;

  // True only for lists created by the seed migration. CR-2 / D-CTL-18
  // (2026-10-07) removed the "system list cannot be deleted" rule: this
  // flag no longer gates A8 `removeList` and has no other behavioral
  // effect — it stays in the schema (append-only migrations) and is
  // surfaced read-only as `isSystem` in list responses.
  @ApiProperty({ type: Boolean, name: 'is_system' })
  @Column({ name: 'is_system', type: 'boolean', default: false })
  is_system: boolean;
}
