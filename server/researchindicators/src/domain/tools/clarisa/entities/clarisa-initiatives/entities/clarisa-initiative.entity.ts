import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultInitiative } from '../../../../../entities/result-initiatives/entities/result-initiative.entity';

@Entity('clarisa_initiatives')
export class ClarisaInitiative extends AuditableEntity {
  @PrimaryColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name?: string;

  @Column({
    name: 'short_name',
    type: 'text',
    nullable: true,
  })
  short_name?: string;

  @Column({
    name: 'official_code',
    type: 'text',
    nullable: true,
  })
  official_code?: string;

  @Column({
    name: 'type_id',
    type: 'bigint',
    nullable: true,
  })
  type_id?: number;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active?: boolean;

  @Column({
    name: 'status',
    type: 'text',
    nullable: true,
  })
  status?: string;

  @Column({
    name: 'stageId',
    type: 'bigint',
    nullable: true,
  })
  stageId?: number;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    name: 'action_area_id',
    type: 'bigint',
    nullable: true,
  })
  action_area_id?: number;

  @Column({
    name: 'action_area_description',
    type: 'text',
    nullable: true,
  })
  action_area_description?: string;

  @Column({
    name: 'stages',
    type: 'json',
    nullable: true,
    select: false,
  })
  stages?: {
    id: number;
    active: boolean;
    stageId: number;
    initvStgId: number;
  }[];

  @OneToMany(
    () => ResultInitiative,
    (resultInitiative) => resultInitiative.clarisa_initiative,
  )
  result_initiatives!: ResultInitiative[];
}
