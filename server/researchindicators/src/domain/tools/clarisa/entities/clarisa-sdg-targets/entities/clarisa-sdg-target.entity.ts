import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { LeverSdgTarget } from '../../../../../entities/lever-sdg-targets/entities/lever-sdg-target.entity';

@Entity('clarisa_sdg_targets')
export class ClarisaSdgTarget extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'sdg_target',
    nullable: true,
  })
  sdg_target: string;

  @Column({
    type: 'text',
    name: 'sdg_target_code',
    nullable: true,
  })
  sdg_target_code: string;

  @OneToMany(
    () => LeverSdgTarget,
    (leverSdgTarget) => leverSdgTarget.sdg_target,
  )
  lever_sdg_targets: LeverSdgTarget[];
}
