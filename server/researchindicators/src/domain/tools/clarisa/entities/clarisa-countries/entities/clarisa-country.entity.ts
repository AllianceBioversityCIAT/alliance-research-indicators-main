import { Column, Entity } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_countries')
export class ClarisaCountry extends AuditableEntity {
  @Column('bigint', {
    name: 'code',
    primary: true,
    nullable: false,
  })
  code!: number;

  @Column('varchar', {
    length: 3,
    name: 'isoAlpha2',
    nullable: false,
  })
  isoAlpha2!: string;

  @Column('varchar', {
    length: 4,
    name: 'isoAlpha3',
    nullable: false,
  })
  isoAlpha3!: string;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('decimal', {
    name: 'longitude',
    nullable: false,
    precision: 8,
    scale: 4,
  })
  longitude!: number;

  @Column('decimal', {
    name: 'latitude',
    nullable: false,
    precision: 8,
    scale: 4,
  })
  latitude!: number;
}
