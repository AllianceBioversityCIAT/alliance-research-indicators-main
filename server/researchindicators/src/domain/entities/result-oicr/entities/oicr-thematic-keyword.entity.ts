import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('oicr_thematic_keywords')
export class OicrThematicKeyword extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;
}
