import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_oicr_thematic_keywords')
export class ResultOicrThematicKeyword extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'result_id', nullable: false })
  result_id: number;

  @Column({ type: 'bigint', name: 'oicr_thematic_keyword_id', nullable: false })
  @ApiProperty({ description: 'The thematic keyword catalog id', example: 1 })
  oicr_thematic_keyword_id: number;
}
