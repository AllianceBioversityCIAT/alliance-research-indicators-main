import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('gender')
export class Gender extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'gender_id',
    type: 'bigint',
  })
  gender_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.gender,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
