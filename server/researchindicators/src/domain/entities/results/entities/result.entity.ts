import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Indicator } from '../../indicators/entities/indicator.entity';
import { ClarisaGeoScope } from '../../../tools/clarisa/entities/clarisa-geo-scope/entities/clarisa-geo-scope.entity';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';
import { ResultRegion } from '../../result-regions/entities/result-region.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ResultLanguage } from '../../result-languages/entities/result-language.entity';
import { ResultKeyword } from '../../result-keywords/entities/result-keyword.entity';
import { ResultInstitution } from '../../result-institutions/entities/result-institution.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';
import { ResultPolicyChange } from '../../result-policy-change/entities/result-policy-change.entity';
import { LinkResult } from '../../link-results/entities/link-result.entity';
import { ResultStatus } from '../../result-status/entities/result-status.entity';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { ReportYear } from '../../report-year/entities/report-year.entity';

@Entity('results')
export class Result extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_id',
    type: 'bigint',
  })
  result_id!: number;

  @Column('bigint', {
    name: 'result_official_code',
    nullable: false,
  })
  result_official_code!: number;

  @Column('bigint', {
    name: 'version_id',
    nullable: true,
  })
  version_id?: number;

  @Column('text', {
    name: 'title',
    nullable: true,
  })
  title?: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description?: string;

  @Column('bigint', {
    name: 'indicator_id',
    nullable: true,
  })
  indicator_id?: number;

  @Column('bigint', {
    name: 'geo_scope_id',
    nullable: true,
  })
  geo_scope_id?: number;

  @Column('bigint', {
    name: 'report_year_id',
    nullable: true,
  })
  report_year_id?: number;

  @Column('bigint', {
    name: 'result_status_id',
    default: ResultStatusEnum.EDITING,
    nullable: true,
  })
  result_status_id?: number;

  @ManyToOne(() => ReportYear, (reportYear) => reportYear.results)
  @JoinColumn({ name: 'report_year_id' })
  report_year!: ReportYear;

  @ManyToOne(() => ResultStatus, (resultStatus) => resultStatus.results)
  @JoinColumn({ name: 'result_status_id' })
  result_status!: ResultStatus;

  @ManyToOne(() => Indicator, (indicator) => indicator.results)
  @JoinColumn({ name: 'indicator_id' })
  indicator!: Indicator;

  @ManyToOne(() => ClarisaGeoScope, (indicator) => indicator.results)
  @JoinColumn({ name: 'geo_scope_id' })
  geo_scope!: ClarisaGeoScope;

  @OneToMany(() => ResultContract, (resultContract) => resultContract.result)
  result_contracts!: ResultContract[];

  @OneToMany(() => ResultLever, (resultLever) => resultLever.result)
  result_levers!: ResultLever[];

  @OneToMany(() => ResultRegion, (resultRegion) => resultRegion.result)
  result_regions!: ResultRegion[];

  @OneToMany(() => ResultCountry, (resultCountry) => resultCountry.result)
  result_countries!: ResultCountry[];

  @OneToMany(() => ResultLanguage, (resultLanguage) => resultLanguage.result)
  result_languages!: ResultLanguage[];

  @OneToMany(() => ResultKeyword, (resultKeyword) => resultKeyword.result)
  result_keywords!: ResultKeyword[];

  @OneToMany(
    () => ResultInstitution,
    (resultInstitution) => resultInstitution.result,
  )
  result_institutions!: ResultInstitution[];

  @OneToMany(() => ResultUser, (resultUser) => resultUser.result)
  result_users!: ResultUser[];

  @OneToMany(
    () => ResultPolicyChange,
    (resultPolicyChange) => resultPolicyChange.result,
  )
  results_policy_change!: ResultPolicyChange[];

  @OneToMany(() => LinkResult, (linkResult) => linkResult.result)
  link_results!: LinkResult[];

  @OneToMany(() => LinkResult, (linkResult) => linkResult.other_result)
  link_other_results!: LinkResult[];
}
