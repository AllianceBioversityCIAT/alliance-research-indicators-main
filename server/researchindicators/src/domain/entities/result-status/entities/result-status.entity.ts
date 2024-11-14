import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_status')
export class ResultStatus extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_status_id',
    type: 'bigint',
  })
  result_status_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description!: string;

  @OneToMany(() => Result, (result) => result.result_status)
  results!: Result[];
}
