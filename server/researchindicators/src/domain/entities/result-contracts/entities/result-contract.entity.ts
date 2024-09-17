import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractRole } from '../../contract-roles/entities/contract-role.entity';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';

@Entity('result_contracts')
export class ResultContract extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_contract_id',
    type: 'bigint',
  })
  result_contract_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('varchar', {
    length: 36,
    name: 'contract_id',
  })
  contract_id!: string;

  @Column('bigint', {
    name: 'contract_role_id',
    nullable: false,
  })
  contract_role_id!: number;

  @ManyToOne(
    () => ContractRole,
    (contractRole) => contractRole.result_contracts,
  )
  @JoinColumn({ name: 'contract_role_id' })
  contract_role!: ContractRole;

  @ManyToOne(() => Result, (result) => result.result_contracts)
  @JoinColumn({ name: 'result_id' })
  result!: Result;

  @ManyToOne(
    () => AgressoContract,
    (agressoContract) => agressoContract.result_contracts,
  )
  @JoinColumn({ name: 'contract_id' })
  agresso_contract!: AgressoContract;
}
