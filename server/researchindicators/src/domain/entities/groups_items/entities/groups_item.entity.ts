import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  RelationId,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { IndicatorPerItem } from '../../indicator_per_item/entities/indicator_per_item.entity';

@Entity('groups_items')
export class GroupItem extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    name: 'official_code',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  officialCode: string;

  @Column({ name: 'agreement_id', type: 'int', nullable: true })
  agreementId?: number;

  @ManyToOne(() => GroupItem, (group) => group.childGroups, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parentGroup?: GroupItem | null;

  @OneToMany(() => GroupItem, (group) => group.parentGroup)
  childGroups?: GroupItem[];

  @RelationId((groupItem: GroupItem) => groupItem.parentGroup)
  parent_id?: number | null;

  @OneToMany(() => IndicatorPerItem, (gip) => gip.groupItem)
  indicatorPerItem: IndicatorPerItem[];
}
