import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';

@Entity('agresso_contract_countries')
export class AgressoContractCountry extends AuditableEntity {
  @Column('varchar', {
    primary: true,
    length: 36,
    name: 'agreement_id',
  })
  agreement_id!: string;

  @Column('varchar', {
    primary: true,
    length: 3,
    name: 'iso_alpha_2',
  })
  iso_alpha_2!: string;

  @ManyToOne(
    () => AgressoContract,
    (agressoContract) => agressoContract.countries,
  )
  @JoinColumn({ name: 'agreement_id' })
  contract?: AgressoContract;
}
