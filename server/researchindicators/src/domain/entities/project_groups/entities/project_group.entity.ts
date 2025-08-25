import {
  Entity,
  PrimaryGeneratedColumn,
  Column
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('project_groups')
export class ProjectGroup extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'level', type: 'int', nullable: false })
  level: number;

  @Column({ name: 'agreement_id', type: 'varchar', nullable: false })
  agreement_id: string;
}
