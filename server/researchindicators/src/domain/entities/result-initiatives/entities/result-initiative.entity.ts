import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInitiative } from '../../../tools/clarisa/entities/clarisa-initiatives/entities/clarisa-initiative.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_initiatives')
export class ResultInitiative extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
    nullable: false,
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'clarisa_initiative_id',
    nullable: false,
  })
  @ApiProperty({
    description: 'The unique identifier for the Clarisa initiative',
    example: 1,
  })
  clarisa_initiative_id: number;

  @ManyToOne(() => Result, (result) => result.result_initiatives)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => ClarisaInitiative,
    (clarisaInitiative) => clarisaInitiative.result_initiatives,
  )
  @JoinColumn({ name: 'clarisa_initiative_id' })
  clarisa_initiative: ClarisaInitiative;
}
