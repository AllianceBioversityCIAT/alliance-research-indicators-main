import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultSdg } from '../../../../../entities/result-sdgs/entities/result-sdg.entity';

@Entity('clarisa_sdgs')
export class ClarisaSdg extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'bigint',
    name: 'smo_code',
    nullable: true,
  })
  smo_code: number;

  @Column({
    type: 'text',
    name: 'financial_code',
    nullable: true,
  })
  financial_code: string;

  @Column({
    type: 'text',
    name: 'short_name',
    nullable: true,
  })
  short_name: string;

  @Column({
    type: 'text',
    name: 'full_name',
    nullable: true,
  })
  full_name: string;

  @Column({
    type: 'text',
    name: 'icon',
    nullable: true,
  })
  icon: string;

  @Column({
    type: 'text',
    name: 'color',
    nullable: true,
  })
  color: string;

  @Column({
    type: 'text',
    name: 'description',
    nullable: true,
  })
  description: string;

  @OneToMany(() => ResultSdg, (resultSdg) => resultSdg.clarisa_sdg)
  result_sdgs!: ResultSdg[];
}
