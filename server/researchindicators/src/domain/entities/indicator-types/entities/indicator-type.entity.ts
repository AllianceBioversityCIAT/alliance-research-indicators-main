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

  @OneToMany(() => Indicator, (indicator) => indicator.indicatorType)
  indicators!: Indicator[];
}
