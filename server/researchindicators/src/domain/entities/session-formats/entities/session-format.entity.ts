import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('session_formats')
export class SessionFormat extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'session_format_id',
    type: 'bigint',
  })
  session_format_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.session_format,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
