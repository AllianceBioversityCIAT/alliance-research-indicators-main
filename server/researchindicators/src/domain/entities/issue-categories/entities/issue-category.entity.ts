import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('issue_categories')
export class IssueCategory extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'issue_category_id',
    type: 'bigint',
  })
  issue_category_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('text', {
    name: 'description',
    nullable: false,
  })
  description!: string;
}
