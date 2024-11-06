import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultPolicyChange } from '../../result-policy-change/entities/result-policy-change.entity';

@Entity('policy_stage')
export class PolicyStage extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'policy_stage_id',
    type: 'bigint',
  })
  policy_stage_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description!: string;

  @OneToMany(
    () => ResultPolicyChange,
    (resultPolicyChange) => resultPolicyChange.policy_stage,
  )
  results_policy_change!: ResultPolicyChange[];
}
