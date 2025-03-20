import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ApiProperty } from '@nestjs/swagger';
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';

@Entity('result_keywords')
export class ResultKeyword extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_keyword_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_keyword_id',
    type: 'bigint',
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  result_keyword_id!: number;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  result_id!: number;

  @ApiProperty({
    type: String,
    name: 'keyword',
  })
  @Column('text', {
    name: 'keyword',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  keyword!: string;

  @ManyToOne(() => Result, (result) => result.result_keywords)
  @JoinColumn({ name: 'result_id' })
  result!: Result;
}
