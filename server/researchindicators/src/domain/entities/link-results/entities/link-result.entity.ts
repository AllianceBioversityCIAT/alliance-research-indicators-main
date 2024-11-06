import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { LinkResultRole } from '../../link-result-roles/entities/link-result-role.entity';

@Entity('link_results')
export class LinkResult extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'link_result_id',
    type: 'bigint',
  })
  link_result_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'other_result_id',
    nullable: false,
  })
  other_result_id!: number;

  @Column('bigint', {
    name: 'link_result_role_id',
    nullable: false,
  })
  link_result_role_id!: number;

  @ManyToOne(() => Result, (result) => result.link_results)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => Result, (result) => result.link_other_results)
  @JoinColumn({ name: 'other_result_id' })
  other_result!: Result;

  @ManyToOne(
    () => LinkResultRole,
    (linkResultRole) => linkResultRole.link_results,
  )
  @JoinColumn({ name: 'link_result_role_id' })
  link_result_role!: LinkResultRole;
}
