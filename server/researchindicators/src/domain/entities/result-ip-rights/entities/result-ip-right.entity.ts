import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { IntellectualPropertyOwner } from '../../intellectual-property-owners/entities/intellectual-property-owner.entity';
import { Result } from '../../results/entities/result.entity';
import { IpRightsApplicationOption } from '../../ip-rights-application-options/entities/ip-rights-application-option.entity';

@Entity('result_ip_rights')
export class ResultIpRight extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_ip_rights_id',
    type: 'bigint',
  })
  result_ip_rights_id: number;

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

  @Column({
    name: 'private_sector_engagement_id',
    type: 'bigint',
    nullable: true,
  })
  private_sector_engagement_id?: number;

  @Column({
    name: 'formal_ip_rights_application_id',
    type: 'bigint',
    nullable: true,
  })
  formal_ip_rights_application_id?: number;

  @ManyToOne(() => IntellectualPropertyOwner, (ipo) => ipo.result_ip_rights)
  @JoinColumn({ name: 'asset_ip_owner_id' })
  intellectualPropertyOwner: IntellectualPropertyOwner;

  @ManyToOne(() => Result, (result) => result.result_ip_rights)
  @JoinColumn({ name: 'result_ip_rights_id' })
  result: Result;

  @ManyToOne(
    () => IpRightsApplicationOption,
    (option) => option.private_sector_engagement,
  )
  @JoinColumn({ name: 'private_sector_engagement_id' })
  privateSectorEngagement: IpRightsApplicationOption;

  @ManyToOne(
    () => IpRightsApplicationOption,
    (option) => option.formal_ip_rights_application,
  )
  @JoinColumn({ name: 'formal_ip_rights_application_id' })
  formalIpRightsApplication: IpRightsApplicationOption;
}
