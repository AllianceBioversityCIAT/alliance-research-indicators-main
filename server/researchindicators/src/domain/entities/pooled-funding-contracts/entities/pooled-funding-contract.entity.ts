import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AgressoContract } from '../../agresso-contract/entities/agresso-contract.entity';

@Entity('pooled_funding_contracts')
export class PooledFundingContract extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column('varchar', {
    length: 36,
    name: 'agreement_id',
  })
  agreement_id!: string;

  @Column('text', {
    name: 'cgiar_entity_code',
    nullable: true,
  })
  cgiar_entity_code: string;

  @Column('text', {
    name: 'cgiar_entity_name',
    nullable: true,
  })
  cgiar_entity_name: string;

  @ManyToOne(() => AgressoContract, (ac) => ac.pooled_funding_contracts)
  @JoinColumn({ name: 'agreement_id' })
  agresso_contract!: AgressoContract;
}
