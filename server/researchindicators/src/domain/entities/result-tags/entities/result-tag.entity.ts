import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_tags')
export class ResultTag extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
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
    name: 'tag_id',
    nullable: false,
  })
  tag_id: number;

  @ManyToOne(() => Tag, (tag) => tag.result_tags)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @ManyToOne(() => Result, (result) => result.result_tags)
  @JoinColumn({ name: 'result_id' })
  result: Result;
}
