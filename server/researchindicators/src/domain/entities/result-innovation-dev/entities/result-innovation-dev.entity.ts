import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInnovationCharacteristic } from '../../../tools/clarisa/entities/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../tools/clarisa/entities/clarisa-innovation-types/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { InnovationDevAnticipatedUser } from '../../innovation-dev-anticipated-users/entities/innovation-dev-anticipated-user.entity';
import { ToolFunction } from '../../tool-functions/entities/tool-function.entity';
import { DisseminationQualification } from '../../dissemination-qualifications/entities/dissemination-qualification.entity';

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

  @Column('bigint', {
    name: 'tool_function_id',
    nullable: true,
  })
  tool_function_id?: number;

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
    () => ToolFunction,
    (toolFunction) => toolFunction.result_innovations_dev,
  )
  @JoinColumn({ name: 'tool_function_id' })
  tool_function!: ToolFunction;
}
