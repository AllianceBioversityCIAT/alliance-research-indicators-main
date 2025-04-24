import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../global-dto/auditable.entity';

@Entity('sec_template')
export class Template extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'sec_template_id',
    type: 'bigint',
  })
  sec_template_id!: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'template',
    type: 'text',
  })
  template!: string;

  @Column({
    name: 'parent_id',
    type: 'bigint',
    nullable: true,
  })
  parent_id?: number;

  @ManyToOne(() => Template, (t) => t.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Template;

  @OneToMany(() => Template, (t) => t.parent)
  children?: Template[];
}
