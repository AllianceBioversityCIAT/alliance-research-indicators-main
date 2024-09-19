import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';

@Entity('delivery_modalities')
export class DeliveryModality extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'delivery_modality_id',
    type: 'bigint',
  })
  delivery_modality_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.delivery_modality,
  )
  result_capacity_sharings!: ResultCapacitySharing[];
}
