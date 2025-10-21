import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_global_targets')
export class ClarisaGlobalTarget extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'targetId',
  })
  targetId: number;

  @Column({
    type: 'varchar',
    name: 'smo_code',
    length: 10,
  })
  smo_code: string;

  @Column({
    type: 'text',
    name: 'target',
  })
  target: string;

  @Column({
    type: 'bigint',
    name: 'impactAreaId',
  })
  impactAreaId: number;

  @Column({
    type: 'varchar',
    name: 'impactAreaName',
    length: 255,
  })
  impactAreaName: string;
}
