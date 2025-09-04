import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('TEMP_result_external_oicrs')
export class TempResultExternalOicr extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  @ApiProperty({
    type: Number,
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'external_oicr_id',
  })
  @ApiProperty({
    type: Number,
  })
  external_oicr_id: number;
}
