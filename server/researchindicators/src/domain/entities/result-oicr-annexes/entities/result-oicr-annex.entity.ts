import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_oicr_annexes')
export class ResultOicrAnnex extends AuditableEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  @ApiProperty({ required: false, description: 'Sent to update a stored row' })
  id?: number;

  @Column({ type: 'bigint', name: 'result_id', nullable: false })
  result_id: number;

  @Column({ type: 'tinyint', name: 'annex_type_id', nullable: false })
  @ApiProperty({
    description:
      '1 = Photos, 2 = Maps/figures/tables/graphs, 3 = Partners logos',
    enum: [1, 2, 3],
  })
  annex_type_id: number;

  @Column({ type: 'text', name: 'description', nullable: true })
  @ApiProperty({ required: false })
  description?: string;

  @Column({ type: 'text', name: 'photo_credits', nullable: true })
  @ApiProperty({ required: false, description: 'Type 1 only' })
  photo_credits?: string;

  @Column({ type: 'varchar', length: 20, name: 'file_type', nullable: true })
  @ApiProperty({
    required: false,
    description: 'Type 2 only',
    enum: ['Map', 'Figure', 'Table', 'Graph'],
  })
  file_type?: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'partner_consent',
    nullable: true,
  })
  @ApiProperty({
    required: false,
    description: 'Type 3 only',
    enum: ['Yes', 'No', 'Not applicable'],
  })
  partner_consent?: string;

  @Column({ type: 'text', name: 'link', nullable: true })
  @ApiProperty({ required: false })
  link?: string;
}
