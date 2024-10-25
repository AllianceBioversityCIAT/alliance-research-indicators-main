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
import { ApiProperty } from '@nestjs/swagger';

@Entity('result_contracts')
export class ResultContract extends AuditableEntity {
  @ApiProperty({
    type: Number,
    name: 'result_contract_id',
  })
  @PrimaryGeneratedColumn({
    name: 'result_contract_id',
    type: 'bigint',
  })
  result_contract_id!: number;

  @ApiProperty({
    type: Number,
    name: 'result_id',
  })
  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @ApiProperty({
    type: String,
    name: 'contract_id',
  })
  @Column('varchar', {
    length: 36,
    name: 'contract_id',
  })
  contract_id!: string;

  @ApiProperty({
    type: Number,
    name: 'contract_role_id',
  })
  @Column('bigint', {
    name: 'contract_role_id',
    nullable: false,
  })
  contract_role_id!: number;

  @ApiProperty({
    type: Boolean,
    name: 'is_primary',
  })
  @Column('boolean', {
    name: 'is_primary',
    nullable: false,
    default: false,
  })
  is_primary!: boolean;

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
