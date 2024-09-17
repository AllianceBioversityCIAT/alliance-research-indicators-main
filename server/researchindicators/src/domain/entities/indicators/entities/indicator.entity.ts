import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('indicators')
export class Indicator extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'indicator_id',
    type: 'bigint',
  })
  indicator_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => Result, (result) => result.indicator)
  results!: Result[];
}
