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
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { SubmissionHistory } from '../../green-checks/entities/submission-history.entity';
import { ResultEvidence } from '../../result-evidences/entities/result-evidence.entity';
import { TempResultAi } from './temp-result-ai.entity';
import { ResultCapacitySharing } from '../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';
import { ResultActor } from '../../result-actors/entities/result-actor.entity';
import { ResultInstitutionType } from '../../result-institution-types/entities/result-institution-type.entity';
import { ResultSdg } from '../../result-sdgs/entities/result-sdg.entity';
import { ResultIpRight } from '../../result-ip-rights/entities/result-ip-right.entity';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';
import { ResultInitiative } from '../../result-initiatives/entities/result-initiative.entity';
import { ResultOicr } from '../../result-oicr/entities/result-oicr.entity';
import { ReportingPlatform } from './reporting-platform.entity';
import { ResultInstitutionAi } from '../../result-institutions/entities/result-institution-ai.entity';
import { ResultUserAi } from '../../result-users/entities/result-user-ai.entity';
import { ResultQuantification } from '../../result-quantifications/entities/result-quantification.entity';
import { ResultNotableReference } from '../../result-notable-references/entities/result-notable-reference.entity';
import { ResultImpactArea } from '../../result-impact-areas/entities/result-impact-area.entity';
import { ResultKnowledgeProduct } from '../../result-knowledge-product/entities/result-knowledge-product.entity';

@Entity('results')
export class Result extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_id',
    type: 'bigint',
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  result_id!: number;

  @Column('bigint', {
    name: 'result_official_code',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'keyword',
  })
  result_official_code!: number;

  @Column('bigint', {
    name: 'version_id',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  version_id?: number;

  @Column('text', {
    name: 'title',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
    fielddata: true,
  })
  title?: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  description?: string;

  @Column('bigint', {
    name: 'indicator_id',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  indicator_id?: number;

  @Column('bigint', {
    name: 'geo_scope_id',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  geo_scope_id?: number;

  @Column('bigint', {
    name: 'report_year_id',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  report_year_id?: number;

  @Column('bigint', {
    name: 'result_status_id',
    default: ResultStatusEnum.DRAFT,
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  result_status_id?: number;

  @Column('bigint', {
    name: 'tip_id',
    nullable: true,
  })
  tip_id?: number;

  @Column('boolean', {
    name: 'is_snapshot',
    nullable: true,
  })
  is_snapshot?: boolean;

  @Column('boolean', {
    name: 'is_ai',
    nullable: true,
    default: false,
  })
  is_ai?: boolean;

  @Column('text', {
    name: 'comment_geo_scope',
    nullable: true,
  })
  comment_geo_scope?: string;

  @Column('varchar', {
    name: 'platform_code',
    length: 50,
    nullable: true,
  })
  platform_code?: string;

  @Column('boolean', {
    name: 'is_partner_not_applicable',
    nullable: true,
  })
  is_partner_not_applicable?: boolean;

  @Column('text', {
    name: 'external_link',
    nullable: true,
  })
  external_link?: string;

  @Column('text', {
    name: 'document_link',
    nullable: true,
  })
  document_link?: string;

  @ManyToOne(
    () => ReportingPlatform,
    (reportingPlatform) => reportingPlatform.results,
  )
  @JoinColumn({ name: 'platform_code' })
  platform!: ReportingPlatform;

  @ManyToOne(() => ReportYear, (reportYear) => reportYear.results)
  @JoinColumn({ name: 'report_year_id' })
  report_year!: ReportYear;

  @ManyToOne(() => ResultStatus, (resultStatus) => resultStatus.results)
  @JoinColumn({ name: 'result_status_id' })
  @OpenSearchProperty({
    type: 'object',
    nestedType: ResultStatus,
  })
  result_status!: ResultStatus;

  @ManyToOne(() => Indicator, (indicator) => indicator.results)
  @JoinColumn({ name: 'indicator_id' })
  @OpenSearchProperty({
    type: 'object',
    nestedType: Indicator,
  })
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
  @OpenSearchProperty({
    type: 'nested',
    nestedType: ResultKeyword,
  })
  result_keywords?: ResultKeyword[];

  @OneToMany(
    () => ResultInstitution,
    (resultInstitution) => resultInstitution.result,
  )
  result_institutions?: ResultInstitution[];

  @OneToMany(() => ResultUser, (resultUser) => resultUser.result)
  result_users?: ResultUser[];

  @OneToMany(
    () => ResultPolicyChange,
    (resultPolicyChange) => resultPolicyChange.result,
  )
  results_policy_change?: ResultPolicyChange[];

  @OneToMany(() => LinkResult, (linkResult) => linkResult.result)
  link_results?: LinkResult[];

  @OneToMany(() => LinkResult, (linkResult) => linkResult.other_result)
  link_other_results?: LinkResult[];

  @OneToMany(
    () => SubmissionHistory,
    (submissionHistory) => submissionHistory.result,
  )
  submission_histories?: SubmissionHistory[];

  @OneToMany(() => ResultEvidence, (resultEvidence) => resultEvidence.result)
  result_evidences?: ResultEvidence[];

  @OneToMany(() => TempResultAi, (tempResultAi) => tempResultAi.result)
  temp_result_ai?: TempResultAi[];

  @OneToMany(
    () => ResultCapacitySharing,
    (resultCapacitySharing) => resultCapacitySharing.result,
  )
  result_capacity_sharings?: ResultCapacitySharing[];

  @OneToMany(() => ResultIpRight, (resultIpRight) => resultIpRight.result)
  result_ip_rights!: ResultIpRight[];

  @OneToMany(
    () => ResultInnovationDev,
    (resultInnovationDev) => resultInnovationDev.result,
  )
  result_innovation_dev!: ResultInnovationDev[];

  @OneToMany(() => ResultActor, (resultActor) => resultActor.result)
  result_actors!: ResultActor[];

  @OneToMany(
    () => ResultInstitutionType,
    (resultInstitutionType) => resultInstitutionType.result,
  )
  result_institution_types!: ResultInstitutionType[];

  @OneToMany(() => ResultSdg, (resultSdg) => resultSdg.result)
  result_sdgs!: ResultSdg[];

  @OneToMany(() => ResultTag, (resultTag) => resultTag.result)
  result_tags!: ResultTag[];

  @OneToMany(
    () => ResultInitiative,
    (resultInitiative) => resultInitiative.result,
  )
  result_initiatives!: ResultInitiative[];

  @OneToMany(() => ResultOicr, (resultOicr) => resultOicr.result)
  result_oicrs!: ResultOicr[];

  @OneToMany(
    () => ResultInstitutionAi,
    (resultInstitutionAi) => resultInstitutionAi.result,
  )
  institutions_ai?: ResultInstitutionAi[];

  @OneToMany(() => ResultUserAi, (resultUserAi) => resultUserAi.result)
  users_ai?: ResultUserAi[];

  @OneToMany(
    () => ResultQuantification,
    (resultQuantification) => resultQuantification.result,
  )
  result_quantifications?: ResultQuantification[];

  @OneToMany(
    () => ResultNotableReference,
    (resultNotableReference) => resultNotableReference.result,
  )
  result_notable_references?: ResultNotableReference[];

  @OneToMany(
    () => ResultImpactArea,
    (resultImpactArea) => resultImpactArea.result,
  )
  resultImpactAreas?: ResultImpactArea[];

  @OneToMany(() => ResultKnowledgeProduct, (rkp) => rkp.result)
  knowledge_products?: ResultKnowledgeProduct[];
}
