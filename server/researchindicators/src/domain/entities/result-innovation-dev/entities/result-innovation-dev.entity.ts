import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_innovation_dev')
export class ResultInnovationDev extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'short_title',
    type: 'text',
    nullable: true,
  })
  short_title?: string;

  @Column({
    name: 'innovation_nature_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_nature_id?: number;

  @Column({
    name: 'innovation_type_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_type_id?: number;

  @Column({
    name: 'innovation_readiness_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_readiness_id?: number;

  @ManyToOne(() => Result, (result) => result.result_innovation_dev)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;
}
