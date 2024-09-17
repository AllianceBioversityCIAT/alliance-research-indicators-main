import { Column, Entity, OneToMany } from 'typeorm';
import { Result } from '../../../../../entities/results/entities/result.entity';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_geo_scope')
export class ClarisaGeoScope extends AuditableEntity {
  @Column('bigint', {
    name: 'code',
    primary: true,
    nullable: false,
  })
  code!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
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
