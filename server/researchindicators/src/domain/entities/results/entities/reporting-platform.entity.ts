import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from './result.entity';

@Entity('reporting_platforms')
export class ReportingPlatform extends AuditableEntity {
  @PrimaryColumn({
    name: 'platform_code',
    type: 'varchar',
    length: 50,
  })
  platform_code!: string;

  @Column('text', {
    name: 'platform_name',
    nullable: true,
  })
  platform_name!: string;

  @Column('text', {
    name: 'platform_url',
    nullable: true,
  })
  platform_url!: string;

  @Column('text', {
    name: 'responsible_name',
    nullable: true,
  })
  responsible_name!: string;

  @Column('text', {
    name: 'responsible_email',
    nullable: true,
  })
  responsible_email!: string;

  @OneToMany(() => Result, (result) => result.platform)
  results!: Result[];
}
