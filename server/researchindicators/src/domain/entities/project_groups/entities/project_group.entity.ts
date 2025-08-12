import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('project_groups')
export class ProjectGroup extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @ManyToOne(() => ProjectGroup, (group) => group.childGroups, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_group_id' })
  parentGroup?: ProjectGroup;

  @OneToMany(() => ProjectGroup, (group) => group.parentGroup, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  childGroups: ProjectGroup[];
}
