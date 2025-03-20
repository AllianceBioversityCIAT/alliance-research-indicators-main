import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('degrees')
export class Degree extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'degree_id',
    type: 'bigint',
  })
  degree_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.degree,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
