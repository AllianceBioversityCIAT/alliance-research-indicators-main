import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('session_lengths')
export class SessionLength extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'session_length_id',
    type: 'bigint',
  })
  session_length_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.session_length,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
