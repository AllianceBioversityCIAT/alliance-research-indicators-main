import { Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('report_years')
export class ReportYear extends AuditableEntity {
  @PrimaryColumn({
    name: 'report_year',
    type: 'year',
  })
  report_year!: number;

  @OneToMany(() => Result, (result) => result.report_year)
  results!: Result[];
}
