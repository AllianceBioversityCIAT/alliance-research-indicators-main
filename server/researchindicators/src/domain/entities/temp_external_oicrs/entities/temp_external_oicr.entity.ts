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
}
