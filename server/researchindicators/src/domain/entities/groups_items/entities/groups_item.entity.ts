import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { IndicatorPerItem } from '../../indicator_per_item/entities/indicator_per_item.entity';

@Entity('groups_items')
export class GroupItem extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  group_name?: string;

  @Column({
    name: 'official_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  code: string;

  @Column({
    name: 'agreement_id',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  agreement_id: string;

  @Column({ name: 'parent_id', type: 'int', nullable: true })
  parent_id?: number | null;

  @Column({ name: 'custom_field_1', type: 'text', nullable: true })
  custom_field_1?: string | null;

  @Column({ name: 'custom_field_2', type: 'text', nullable: true })
  custom_field_2?: string | null;

  @Column({ name: 'custom_field_3', type: 'text', nullable: true })
  custom_field_3?: string | null;

  @Column({ name: 'custom_field_4', type: 'text', nullable: true })
  custom_field_4?: string | null;

  @Column({ name: 'custom_field_5', type: 'text', nullable: true })
  custom_field_5?: string | null;

  @Column({ name: 'custom_field_6', type: 'text', nullable: true })
  custom_field_6?: string | null;

  @Column({ name: 'custom_field_7', type: 'text', nullable: true })
  custom_field_7?: string | null;

  @Column({ name: 'custom_field_8', type: 'text', nullable: true })
  custom_field_8?: string | null;

  @Column({ name: 'custom_field_9', type: 'text', nullable: true })
  custom_field_9?: string | null;

  @Column({ name: 'custom_field_10', type: 'text', nullable: true })
  custom_field_10?: string | null;

  @ManyToOne(() => GroupItem, (group) => group.childGroups, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parentGroup?: GroupItem | null;

  @OneToMany(() => GroupItem, (group) => group.parentGroup)
  childGroups?: GroupItem[];

  @OneToMany(() => IndicatorPerItem, (gip) => gip.groupItem)
  indicatorPerItem: IndicatorPerItem[];
}
