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
import { PolicyType } from '../../policy-types/entities/policy-type.entity';
import { PolicyStage } from '../../policy-stages/entities/policy-stage.entity';
import { ResultPoolFundingIndicatorMapping } from '../../bilateral/entities/result-pool-funding-indicator-mapping.entity';

@Entity('result_policy_change')
export class ResultPolicyChange extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'policy_type_id',
    nullable: true,
  })
  policy_type_id?: number;

  @Column('bigint', {
    name: 'policy_stage_id',
    nullable: true,
  })
  policy_stage_id?: number;

  @Column('text', {
    name: 'evidence_stage',
    nullable: true,
  })
  evidence_stage?: string;

  /** Required when policy_type_id = 3 (Program, Budget, or Investment). */
  @Column('decimal', {
    name: 'usd_amount',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  usd_amount?: number | null;

  /** Confirmed | Estimated | Unknown — required when policy_type_id = 3. */
  @Column('varchar', {
    name: 'amount_status',
    length: 20,
    nullable: true,
  })
  amount_status?: string | null;

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

  @OneToMany(
    () => ResultPoolFundingIndicatorMapping,
    (mapping) => mapping.result_policy_change,
  )
  pool_funding_indicator_mappings?: ResultPoolFundingIndicatorMapping[];
}
