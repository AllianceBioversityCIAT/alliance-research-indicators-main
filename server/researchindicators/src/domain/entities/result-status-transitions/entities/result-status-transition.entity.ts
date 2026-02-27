import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('result_status_transitions')
export class ResultStatusTransition extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('bigint', {
    name: 'from_status_id',
    nullable: false,
  })
  from_status_id!: number;

  @Column('bigint', {
    name: 'to_status_id',
    nullable: false,
  })
  to_status_id!: number;
}
