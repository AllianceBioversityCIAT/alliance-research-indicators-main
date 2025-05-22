import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { IntellectualPropertyOwner } from '../../intellectual-property-owners/entities/intellectual-property-owner.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_cap_sharing_ip')
export class ResultCapSharingIp extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_cap_sharing_ip_id',
    type: 'bigint',
  })
  result_cap_sharing_ip_id: number;

  @Column({
    name: 'publicity_restriction',
    type: 'boolean',
    nullable: true,
  })
  publicity_restriction?: boolean;

  @Column({
    name: 'publicity_restriction_description',
    type: 'text',
    nullable: true,
  })
  publicity_restriction_description?: string;

  @Column({
    name: 'requires_futher_development',
    type: 'boolean',
    nullable: true,
  })
  requires_futher_development?: boolean;

  @Column({
    name: 'requires_futher_development_description',
    type: 'text',
    nullable: true,
  })
  requires_futher_development_description?: string;

  @Column({
    name: 'asset_ip_owner_id',
    type: 'bigint',
    nullable: true,
  })
  asset_ip_owner_id?: number;

  @Column({
    name: 'asset_ip_owner_description',
    type: 'text',
    nullable: true,
  })
  asset_ip_owner_description?: string;

  @Column({
    name: 'potential_asset',
    type: 'boolean',
    nullable: true,
  })
  potential_asset?: boolean;

  @Column({
    name: 'potential_asset_description',
    type: 'text',
    nullable: true,
  })
  potential_asset_description?: string;

  @ManyToOne(
    () => IntellectualPropertyOwner,
    (ipo) => ipo.result_cap_sharing_ip,
  )
  @JoinColumn({ name: 'asset_ip_owner_id' })
  intellectualPropertyOwner: IntellectualPropertyOwner;

  @ManyToOne(() => Result, (result) => result.result_cap_sharing_ip)
  @JoinColumn({ name: 'result_cap_sharing_ip_id' })
  result: Result;
}
