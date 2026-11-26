import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_oicr_audiences')
export class ResultOicrAudience extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'result_id', nullable: false })
  result_id: number;

  @Column({ type: 'bigint', name: 'oicr_audience_id', nullable: false })
  @ApiProperty({ description: 'The audience catalog id', example: 1 })
  oicr_audience_id: number;
}
