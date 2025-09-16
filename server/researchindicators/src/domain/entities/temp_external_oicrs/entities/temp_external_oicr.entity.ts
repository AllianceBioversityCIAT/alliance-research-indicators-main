import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('TEMP_external_oicrs')
export class TempExternalOicr extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'title',
    nullable: true,
  })
  title: string;

  @Column({
    type: 'text',
    name: 'result_status',
    nullable: true,
  })
  result_status: string;

  @Column({
    name: 'maturity_level',
    type: 'text',
    nullable: true,
  })
  maturity_level: string;

  @Column({
    type: 'text',
    name: 'report_year',
    nullable: true,
  })
  report_year: string;

  @Column({
    type: 'text',
    name: 'handle_link',
    nullable: true,
  })
  handle_link: string;

  @Column({
    type: 'text',
    name: 'external_id',
    nullable: true,
  })
  external_id: string;

  @Column({
    type: 'text',
    name: 'main_contact_person_list',
    nullable: true,
  })
  main_contact_person_list: string;

  @Column({
    type: 'text',
    name: 'elaboration_narrative',
    nullable: true,
  })
  elaboration_narrative: string;

  @Column({
    type: 'text',
    name: 'lever_list',
    nullable: true,
  })
  lever_list: string;

  @Column({
    type: 'bigint',
    name: 'geo_scope_id',
    nullable: true,
  })
  geo_scope_id: number;

  @Column({
    type: 'text',
    name: 'country_list',
    nullable: true,
  })
  country_list: string;

  @Column({
    type: 'text',
    name: 'region_list',
    nullable: true,
  })
  region_list: string;

  @Column({
    type: 'text',
    name: 'geo_scope_comment',
    nullable: true,
  })
  geo_scope_comment: string;
}
