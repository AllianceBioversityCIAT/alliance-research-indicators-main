import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_capacity_sharing')
export class ResultCapacitySharing extends AuditableEntity {
  @Column('bigint', {
    name: 'result_id',
    primary: true,
    nullable: false,
  })
  result_id!: number;

  @Column('text', {
    name: 'supervisor_name',
    nullable: true,
  })
  supervisor_name?: string;

  @Column('text', {
    name: 'supervisor_email',
    nullable: true,
  })
  supervisor_email?: string;

  @Column('text', {
    name: 'training_title',
    nullable: true,
  })
  training_title?: string;
}
