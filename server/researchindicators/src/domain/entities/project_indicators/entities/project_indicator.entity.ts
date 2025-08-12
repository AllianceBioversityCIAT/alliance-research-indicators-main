import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { IndicatorPerItem } from '../../indicator_per_item/entities/indicator_per_item.entity';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

export enum NumberType {
  SUM = 'sum',
  AVERAGE = 'average',
  COUNT = 'count',
  YES_NO = 'yes/no',
}

export enum NumberFormat {
  NUMBER = 'number',
  DECIMAL = 'decimal',
}

@Entity('project_indicators')
export class ProjectIndicator extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  code?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: NumberType,
    nullable: false,
  })
  number_type: NumberType;

  @Column({
    type: 'enum',
    enum: NumberFormat,
    nullable: true,
  })
  number_format?: NumberFormat;

  @Column({ type: 'varchar', length: 50, nullable: true })
  target_unit?: string;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  target_value?: number;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  base_line?: number;

  @Column({ type: 'json', nullable: true })
  year?: number[];

  @OneToMany(() => IndicatorPerItem, (gip) => gip.projectIndicator)
  indicatorPerItem: IndicatorPerItem[];
}
