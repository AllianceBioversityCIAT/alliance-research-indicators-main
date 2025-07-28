import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultIpRight } from '../../result-ip-rights/entities/result-ip-right.entity';

@Entity('ip_rights_application_options')
export class IpRightsApplicationOption extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultIpRight,
    (resultIpRight) => resultIpRight.privateSectorEngagement,
  )
  private_sector_engagement?: ResultIpRight[];

  @OneToMany(
    () => ResultIpRight,
    (resultIpRight) => resultIpRight.formalIpRightsApplication,
  )
  formal_ip_rights_application?: ResultIpRight[];
}
