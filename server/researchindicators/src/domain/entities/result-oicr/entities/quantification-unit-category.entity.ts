import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('quantification_unit_categories')
export class QuantificationUnitCategory extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'macro_category', type: 'varchar', length: 150 })
  macro_category: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'is_percentage', type: 'boolean', default: false })
  is_percentage: boolean;
}
