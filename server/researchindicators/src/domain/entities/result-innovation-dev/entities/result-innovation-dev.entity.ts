import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInnovationCharacteristic } from '../../../tools/clarisa/entities/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../tools/clarisa/entities/clarisa-innovation-types/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { InnovationDevAnticipatedUser } from '../../innovation-dev-anticipated-users/entities/innovation-dev-anticipated-user.entity';
import { DisseminationQualification } from '../../dissemination-qualifications/entities/dissemination-qualification.entity';
import { ExpansionPotential } from '../../expansion-potentials/entities/expansion-potential.entity';
import { ResultInnovationToolFunction } from '../../result-innovation-tool-function/entities/result-innovation-tool-function.entity';

@Entity('result_innovation_dev')
export class ResultInnovationDev extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'short_title',
    type: 'text',
    nullable: true,
  })
  short_title?: string;

  @Column({
    name: 'innovation_nature_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_nature_id?: number;

  @Column({
    name: 'innovation_type_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_type_id?: number;

  @Column({
    name: 'innovation_readiness_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_readiness_id?: number;

  @Column({
    name: 'innovation_readiness_explanation',
    type: 'text',
    nullable: true,
  })
  innovation_readiness_explanation?: string;

  @Column({
    name: 'no_sex_age_disaggregation',
    type: 'boolean',
    nullable: true,
  })
  no_sex_age_disaggregation?: boolean;

  @Column({
    name: 'anticipated_users_id',
    type: 'bigint',
    nullable: true,
  })
  anticipated_users_id?: number;

  @Column({
    name: 'expected_outcome',
    type: 'text',
    nullable: true,
  })
  expected_outcome?: string;

  @Column({
    name: 'intended_beneficiaries_description',
    type: 'text',
    nullable: true,
  })
  intended_beneficiaries_description?: string;

  @Column({
    name: 'is_new_or_improved_variety',
    type: 'boolean',
    nullable: true,
  })
  is_new_or_improved_variety?: boolean;

  @Column('bigint', {
    name: 'new_or_improved_varieties_count',
    nullable: true,
  })
  new_or_improved_varieties_count?: number;

  // fields for knowledge sharing

  @Column('boolean', {
    name: 'is_knowledge_sharing',
    nullable: true,
  })
  is_knowledge_sharing?: boolean;

  @Column('bigint', {
    name: 'dissemination_qualification_id',
    nullable: true,
  })
  dissemination_qualification_id?: number;

  @Column('text', {
    name: 'tool_useful_context',
    nullable: true,
  })
  tool_useful_context?: string;

  @Column('text', {
    name: 'results_achieved_expected',
    nullable: true,
  })
  results_achieved_expected?: string;

  @Column('boolean', {
    name: 'is_used_beyond_original_context',
    nullable: true,
  })
  is_used_beyond_original_context?: boolean;

  @Column('text', {
    name: 'adoption_adaptation_context',
    nullable: true,
  })
  adoption_adaptation_context?: string;

  @Column('text', {
    name: 'other_tools',
    nullable: true,
  })
  other_tools?: string;

  @Column('text', {
    name: 'other_tools_integration',
    nullable: true,
  })
  other_tools_integration?: string;

  // end of knowledge sharing fields

  // scaling potential fields

  @Column('int', {
    name: 'is_cheaper_than_alternatives',
    nullable: true,
  })
  is_cheaper_than_alternatives?: number;

  @Column('int', {
    name: 'is_simpler_to_use',
    nullable: true,
  })
  is_simpler_to_use?: number;

  @Column('int', {
    name: 'does_perform_better',
    nullable: true,
  })
  does_perform_better?: number;

  @Column('int', {
    name: 'is_desirable_to_users',
    nullable: true,
  })
  is_desirable_to_users?: number;

  @Column('int', {
    name: 'has_commercial_viability',
    nullable: true,
  })
  has_commercial_viability?: number;

  @Column('int', {
    name: 'has_suitable_enabling_environment',
    nullable: true,
  })
  has_suitable_enabling_environment?: number;

  @Column('int', {
    name: 'has_evidence_of_uptake',
    nullable: true,
  })
  has_evidence_of_uptake?: number;

  @Column('bigint', {
    name: 'expansion_potential_id',
    nullable: true,
  })
  expansion_potential_id?: number;

  @Column('text', {
    name: 'expansion_adaptation_details',
    nullable: true,
  })
  expansion_adaptation_details?: string;

  // end of scaling potential fields

  @ManyToOne(() => Result, (result) => result.result_innovation_dev)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;

  @ManyToOne(
    () => ClarisaInnovationCharacteristic,
    (characteristic) => characteristic.result_innovation_dev,
  )
  @JoinColumn({
    name: 'innovation_nature_id',
  })
  innovationNature?: ClarisaInnovationCharacteristic;

  @ManyToOne(() => ClarisaInnovationType, (type) => type.result_innovation_dev)
  @JoinColumn({
    name: 'innovation_type_id',
  })
  innovationType?: ClarisaInnovationType;

  @ManyToOne(
    () => ClarisaInnovationReadinessLevel,
    (readiness) => readiness.result_innovation_dev,
  )
  @JoinColumn({
    name: 'innovation_readiness_id',
  })
  innovationReadiness?: ClarisaInnovationReadinessLevel;

  @ManyToOne(
    () => InnovationDevAnticipatedUser,
    (user) => user.result_innovation_dev,
  )
  @JoinColumn({
    name: 'anticipated_users_id',
  })
  anticipatedUsers?: InnovationDevAnticipatedUser;

  @ManyToOne(
    () => DisseminationQualification,
    (disseminationQualification) =>
      disseminationQualification.result_innovations_dev,
  )
  @JoinColumn({ name: 'dissemination_qualification_id' })
  dissemination_qualification!: DisseminationQualification;

  @ManyToOne(
    () => ExpansionPotential,
    (expansionPotential) => expansionPotential.result_innovations_dev,
  )
  @JoinColumn({ name: 'expansion_potential_id' })
  expansion_potential?: ExpansionPotential;

  @OneToMany(
    () => ResultInnovationToolFunction,
    (resultInnovationToolFunction) =>
      resultInnovationToolFunction.resultInnovationDev,
  )
  result_innovation_tool_functions!: ResultInnovationToolFunction[];
}
