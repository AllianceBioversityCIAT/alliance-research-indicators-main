import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaRegion } from '../../../tools/clarisa/entities/clarisa-regions/entities/clarisa-region.entity';

@Entity('result_regions')
export class ResultRegion extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_region_id',
    type: 'bigint',
  })
  result_region_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'region_id',
    nullable: false,
  })
  region_id!: number;

  @ManyToOne(() => Result, (result) => result.result_regions)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => ClarisaRegion, (region) => region.result_regions)
  @JoinColumn({ name: 'region_id' })
  region!: ClarisaRegion;
}
