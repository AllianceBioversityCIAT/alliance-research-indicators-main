import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from './result.entity';

@Entity('temp_result_ai')
export class TempResultAi extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'processed_object',
    type: 'json',
    nullable: false,
  })
  processed_object!: Record<string, any>;

  @Column({
    name: 'raw_object',
    type: 'json',
    nullable: false,
  })
  raw_object!: Record<string, any>;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: true,
  })
  result_id?: number;

  @ManyToOne(() => Result, (result) => result.temp_result_ai)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;
}
