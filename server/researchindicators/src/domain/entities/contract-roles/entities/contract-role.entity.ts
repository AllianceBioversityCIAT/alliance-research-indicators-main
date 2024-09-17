import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('contract_roles')
export class ContractRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'contract_role_id',
    type: 'bigint',
  })
  contract_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultContract,
    (resultContract) => resultContract.contract_role,
  )
  result_contracts!: ResultContract[];
}
