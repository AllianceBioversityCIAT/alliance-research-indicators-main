import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectGroup } from '../../project_groups/entities/project_group.entity';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('groups_items')
export class GroupItem extends AuditableEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'official_code', type: 'varchar', length: 100, nullable: false })
  officialCode: string;

  @ManyToOne(() => ProjectGroup, (projectGroup) => projectGroup.groupItems, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: ProjectGroup;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId?: number;
}
