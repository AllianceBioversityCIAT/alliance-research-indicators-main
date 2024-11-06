import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { LinkResult } from '../../link-results/entities/link-result.entity';

@Entity('link_result_roles')
export class LinkResultRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'link_result_role_id',
    type: 'bigint',
  })
  link_result_role_id: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name: string;

  @OneToMany(() => LinkResult, (linkResult) => linkResult.link_result_role)
  link_results: LinkResult[];
}
