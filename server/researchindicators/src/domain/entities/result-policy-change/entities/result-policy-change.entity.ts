import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { PolicyType } from '../../policy-types/entities/policy-type.entity';
import { PolicyStage } from '../../policy-stages/entities/policy-stage.entity';

@Entity('result_policy_change')
export class ResultPolicyChange extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'policy_type_id',
    nullable: false,
  })
  policy_type_id!: number;

  @Column('bigint', {
    name: 'policy_stage_id',
    nullable: false,
  })
  policy_stage_id!: number;

  @Column('text', {
    name: 'evidence_stage',
    nullable: false,
  })
  evidence_stage!: string;

  @ManyToOne(() => Result, (result) => result.results_policy_change)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(() => PolicyType, (policyType) => policyType.results_policy_change)
  @JoinColumn({ name: 'policy_type_id' })
  policy_type!: PolicyType;

  @ManyToOne(
    () => PolicyStage,
    (policyStage) => policyStage.results_policy_change,
  )
  @JoinColumn({ name: 'policy_stage_id' })
  policy_stage!: PolicyStage;
}
