import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_innovation_readiness_levels')
export class ClarisaInnovationReadinessLevel extends AuditableEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'level',
    type: 'bigint',
    nullable: true,
  })
  level?: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name?: string;

  @Column({
    name: 'definition',
    type: 'text',
    nullable: true,
  })
  definition?: string;
}
