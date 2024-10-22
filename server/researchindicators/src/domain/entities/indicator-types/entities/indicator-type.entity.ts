import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Indicator } from '../../indicators/entities/indicator.entity';

@Entity('indicator_types')
export class IndicatorType extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'indicator_type_id',
    type: 'bigint',
  })
  indicator_type_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

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

  @OneToMany(() => Indicator, (indicator) => indicator.indicatorType)
  indicators!: Indicator[];
}
