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
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_regions')
export class ResultRegion extends AuditableEntity {
  @ApiProperty({
    type: Number,
    description: 'Result region id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_region_id',
    type: 'bigint',
  })
  result_region_id!: number;

  @ApiProperty({
    type: Number,
    description: 'Result id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @ApiProperty({
    type: Number,
    description: 'Region id',
    required: true,
  })
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
