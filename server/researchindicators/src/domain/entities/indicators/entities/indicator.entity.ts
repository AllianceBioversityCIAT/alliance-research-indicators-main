import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { IndicatorType } from '../../indicator-types/entities/indicator-type.entity';

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

  @Column('text', {
    name: 'other_names',
    nullable: true,
  })
  other_names?: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description?: string;

  @Column('text', {
    name: 'long_description',
    nullable: true,
  })
  long_description?: string;

  @Column('bigint', {
    name: 'indicator_type_id',
    nullable: false,
  })
  indicator_type_id!: number;

  @Column('text', {
    name: 'icon_src',
    nullable: true,
  })
  icon_src?: string;

  @ManyToOne(() => IndicatorType, (indicatorType) => indicatorType.indicators)
  @JoinColumn({ name: 'indicator_type_id' })
  indicatorType!: IndicatorType;

  @OneToMany(() => Result, (result) => result.indicator)
  results!: Result[];
}
