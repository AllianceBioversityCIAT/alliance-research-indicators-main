import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Result } from '../../../../../entities/results/entities/result.entity';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_geo_scope')
export class ClarisaGeoScope extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'code',
    nullable: false,
  })
  code!: number;

  @Column('text', {
    name: 'name',
    nullable: true,
  })
  name!: string;

  @Column('text', {
    name: 'definition',
    nullable: true,
  })
  definition?: string;

  @OneToMany(() => Result, (result) => result.geo_scope)
  results!: Result[];
}
