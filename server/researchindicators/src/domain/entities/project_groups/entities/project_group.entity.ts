import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('project_groups')
export class ProjectGroup extends AuditableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ name: 'level', type: 'int', nullable: false })
  level: number;

  @Column({ name: 'agreement_id', type: 'text', nullable: false })
  agreement_id: string;

  @Column({ name: 'custom_field_1', type: 'text', nullable: true })
  custom_field_1: string;

  @Column({ name: 'custom_field_2', type: 'text', nullable: true })
  custom_field_2: string;

  @Column({ name: 'custom_field_3', type: 'text', nullable: true })
  custom_field_3: string;

  @Column({ name: 'custom_field_4', type: 'text', nullable: true })
  custom_field_4: string;

  @Column({ name: 'custom_field_5', type: 'text', nullable: true })
  custom_field_5: string;

  @Column({ name: 'custom_field_6', type: 'text', nullable: true })
  custom_field_6: string;

  @Column({ name: 'custom_field_7', type: 'text', nullable: true })
  custom_field_7: string;

  @Column({ name: 'custom_field_8', type: 'text', nullable: true })
  custom_field_8: string;

  @Column({ name: 'custom_field_9', type: 'text', nullable: true })
  custom_field_9: string;

  @Column({ name: 'custom_field_10', type: 'text', nullable: true })
  custom_field_10: string;
}
