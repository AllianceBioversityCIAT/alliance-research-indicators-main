import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ApiProperty } from '@nestjs/swagger';
import { ExternalOicrSourceEnum } from '../enum/external-oicr-source.enum';

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

  @Column({
    type: 'varchar',
    length: 20,
    name: 'source',
    default: ExternalOicrSourceEnum.EXTERNAL,
  })
  @ApiProperty({
    enum: ExternalOicrSourceEnum,
    required: false,
    description:
      'external: external_oicr_id is a TEMP_external_oicrs id. result: it is a results.result_id.',
  })
  source: ExternalOicrSourceEnum;
}
