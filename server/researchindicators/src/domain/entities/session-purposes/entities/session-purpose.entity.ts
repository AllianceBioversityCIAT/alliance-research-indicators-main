import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('session_purposes')
export class SessionPurpose extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'session_purpose_id',
    type: 'bigint',
  })
  session_purpose_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.session_purpose,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
