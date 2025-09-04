import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultOicr } from '../../result-oicr/entities/result-oicr.entity';

@Entity('maturity_levels')
export class MaturityLevel extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @Column({
    type: 'text',
    name: 'description',
  })
  description: string;

  @Column({
    type: 'text',
    name: 'full_name',
  })
  full_name: string;

  @OneToMany(() => ResultOicr, (ro) => ro.maturity_level)
  result_oicr: ResultOicr[];
}
