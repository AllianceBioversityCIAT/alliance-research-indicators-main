import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultPolicyChange } from '../../result-policy-change/entities/result-policy-change.entity';

@Entity('policy_types')
export class PolicyType extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'policy_type_id',
  })
  policy_type_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultPolicyChange,
    (resultPolicyChange) => resultPolicyChange.policy_type,
  )
  results_policy_change!: ResultPolicyChange[];
}
