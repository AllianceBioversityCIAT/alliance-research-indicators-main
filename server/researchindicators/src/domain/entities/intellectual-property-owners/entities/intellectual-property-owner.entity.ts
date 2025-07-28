import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultIpRight } from '../../result-ip-rights/entities/result-ip-right.entity';

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
    () => ResultIpRight,
    (resultIpRight) => resultIpRight.intellectualPropertyOwner,
  )
  result_ip_rights: ResultIpRight[];
}
