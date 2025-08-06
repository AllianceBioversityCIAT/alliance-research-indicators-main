import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectGroup } from '../../project_groups/entities/project_group.entity';

@Entity('groups_items')
export class GroupItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'official_code', type: 'varchar', length: 100, nullable: false })
  officialCode: string;

  @ManyToOne(() => ProjectGroup, { nullable: false })
  @JoinColumn({ name: 'group_id' })
  group: ProjectGroup;

  @Column({ name: 'project_id', type: 'int', nullable: true })
  projectId?: number;

  @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
  isActive: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 100, nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 100, nullable: true })
  updatedBy?: string;
}
