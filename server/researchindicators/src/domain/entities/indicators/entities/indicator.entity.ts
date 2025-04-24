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
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';

@Entity('indicators')
export class Indicator extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'indicator_id',
    type: 'bigint',
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  indicator_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  name!: string;

  @Column('text', {
    name: 'other_names',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  other_names?: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  description?: string;

  @Column('text', {
    name: 'long_description',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  long_description?: string;

  @Column('bigint', {
    name: 'indicator_type_id',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  indicator_type_id!: number;

  @Column('text', {
    name: 'icon_src',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  icon_src?: string;

  @Column('bigint', {
    name: 'position',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  position: number;

  @ManyToOne(() => IndicatorType, (indicatorType) => indicatorType.indicators)
  @JoinColumn({ name: 'indicator_type_id' })
  indicatorType!: IndicatorType;

  @OneToMany(() => Result, (result) => result.indicator)
  results!: Result[];
}
