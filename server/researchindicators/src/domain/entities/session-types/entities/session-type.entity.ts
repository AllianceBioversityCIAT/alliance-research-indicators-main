import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('session_types')
export class SessionType extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'session_type_id',
    type: 'bigint',
  })
  session_type_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.session_type,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
