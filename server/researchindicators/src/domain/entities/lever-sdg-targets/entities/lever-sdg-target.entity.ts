import {
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Entity,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ClarisaLever } from '../../../tools/clarisa/entities/clarisa-levers/entities/clarisa-lever.entity';
import { ClarisaSdgTarget } from '../../../tools/clarisa/entities/clarisa-sdg-targets/entities/clarisa-sdg-target.entity';

@Entity('lever_sdg_targets')
@Index('lever_id_sdg_target_id_index', ['lever_id', 'sdg_target_id'])
export class LeverSdgTarget extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'lever_id',
  })
  lever_id: number;

  @Column({
    type: 'bigint',
    name: 'sdg_target_id',
  })
  sdg_target_id: number;

  @ManyToOne(() => ClarisaLever, (lever) => lever.lever_sdg_targets)
  @JoinColumn({ name: 'lever_id' })
  lever: ClarisaLever;

  @ManyToOne(() => ClarisaSdgTarget, (sdgTarget) => sdgTarget.lever_sdg_targets)
  @JoinColumn({ name: 'sdg_target_id' })
  sdg_target: ClarisaSdgTarget;
}
