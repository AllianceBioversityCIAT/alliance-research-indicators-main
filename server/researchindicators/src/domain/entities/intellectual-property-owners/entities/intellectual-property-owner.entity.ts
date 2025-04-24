import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultCapSharingIp } from '../../result-cap-sharing-ip/entities/result-cap-sharing-ip.entity';

@Entity('intellectual_property_owner')
export class IntellectualPropertyOwner extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'intellectual_property_owner_id',
    type: 'bigint',
  })
  intellectual_property_owner_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name: string;

  @OneToMany(
    () => ResultCapSharingIp,
    (resultCapSharingIp) => resultCapSharingIp.intellectualPropertyOwner,
  )
  result_cap_sharing_ip: ResultCapSharingIp[];
}
