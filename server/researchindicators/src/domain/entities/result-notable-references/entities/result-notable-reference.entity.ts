import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { NotableReferenceType } from '../../notable-reference-types/entities/notable-reference-type.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_notable_references')
export class ResultNotableReference extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'notable_reference_type_id',
    nullable: false,
  })
  @ApiProperty()
  notable_reference_type_id: number;

  @Column({
    type: 'text',
    name: 'link',
    nullable: false,
  })
  @ApiProperty()
  link: string;

  @Column({
    type: 'bigint',
    name: 'result_id',
    nullable: false,
  })
  result_id: number;

  @ManyToOne(() => Result, (result) => result.result_notable_references)
  @JoinColumn({ name: 'result_id' })
  result: Result;

  @ManyToOne(
    () => NotableReferenceType,
    (notableReferenceType) => notableReferenceType.result_notable_references,
  )
  @JoinColumn({ name: 'notable_reference_type_id' })
  notable_reference_type: NotableReferenceType;
}
