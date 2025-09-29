import { Entity, Column, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AgressoContractCountry } from '../../agresso-contract-countries/entities/agresso-contract-country.entity';
import { UserAgressoContract } from '../../user-agresso-contracts/entities/user-agresso-contract.entity';
import { ResultContract } from '../../result-contracts/entities/result-contract.entity';
import { ClarisaSdg } from '../../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';

@Entity('agresso_contracts')
export class AgressoContract extends AuditableEntity {
  @Column('varchar', {
    primary: true,
    length: 36,
    name: 'agreement_id',
  })
  agreement_id!: string;

  @Column('decimal', {
    precision: 20,
    scale: 3,
    name: 'center_amount',
    default: 0,
    select: false,
  })
  center_amount: number;

  @Column('decimal', {
    precision: 20,
    scale: 3,
    default: 0,
    name: 'center_amount_usd',
    select: false,
  })
  center_amount_usd: number;

  @Column('text', {
    name: 'client',
    nullable: true,
    select: false,
  })
  client?: string;

  @Column('text', {
    name: 'contract_status',
    nullable: true,
  })
  contract_status?: string;

  @Column('text', {
    name: 'department',
    nullable: true,
    select: false,
  })
  department?: string;

  @Column('text', {
    name: 'departmentId',
    nullable: true,
  })
  departmentId?: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  description?: string;

  @Column('text', {
    name: 'division',
    nullable: true,
  })
  division?: string;

  @Column('text', {
    name: 'divisionId',
    nullable: true,
    select: false,
  })
  divisionId?: string;

  @Column('text', {
    name: 'donor',
    nullable: true,
  })
  donor?: string;

  @Column('text', {
    name: 'donor_reference',
    nullable: true,
  })
  donor_reference?: string;

  @Column('datetime', {
    name: 'endDateGlobal',
    nullable: true,
  })
  endDateGlobal?: Date;

  @Column('datetime', {
    name: 'endDatefinance',
    nullable: true,
  })
  endDatefinance?: Date;

  @Column('datetime', {
    name: 'end_date',
    nullable: true,
  })
  end_date?: Date;

  @Column('text', {
    name: 'entity',
    nullable: true,
  })
  entity?: string;

  @Column('datetime', {
    name: 'extension_date',
    nullable: true,
  })
  extension_date?: Date;

  @Column('text', {
    name: 'funding_type',
    nullable: true,
  })
  funding_type?: string;

  @Column('decimal', {
    precision: 20,
    scale: 3,
    default: 0,
    name: 'grant_amount',
    select: false,
  })
  grant_amount: number;

  @Column('decimal', {
    precision: 20,
    scale: 3,
    default: 0,
    name: 'grant_amount_usd',
    select: false,
  })
  grant_amount_usd: number;

  @Column('text', {
    name: 'project',
    nullable: true,
  })
  project?: string;

  @Column('text', {
    name: 'projectDescription',
    nullable: true,
  })
  projectDescription?: string;

  @Column('text', {
    name: 'project_lead_description',
    nullable: true,
  })
  project_lead_description?: string;

  @Column('text', {
    name: 'short_title',
    nullable: true,
  })
  short_title?: string;

  @Column('datetime', {
    name: 'start_date',
    nullable: true,
  })
  start_date?: Date;

  @Column('text', {
    name: 'ubwClientDescription',
    nullable: true,
  })
  ubwClientDescription?: string;

  @Column('text', {
    name: 'unit',
    nullable: true,
  })
  unit?: string;

  @Column('text', {
    name: 'unitId',
    nullable: true,
    select: false,
  })
  unitId?: string;

  @Column('text', {
    name: 'office',
    nullable: true,
  })
  office?: string;

  @Column('text', {
    name: 'officeId',
    nullable: true,
    select: false,
  })
  officeId?: string;

  @Column('varchar', {
    name: 'programAssistantId',
    length: 15,
    nullable: true,
  })
  programAssistantId: string;

  @Column('text', {
    name: 'programAssistantName',
    nullable: true,
  })
  programAssistantName: string;

  @Column('varchar', {
    length: 15,
    name: 'projectLeadId',
    nullable: true,
  })
  projectLeadId: string;

  @Column('text', {
    name: 'researchAssistantName',
    nullable: true,
  })
  researchAssistantName: string;

  @Column('varchar', {
    name: 'researchAssistantId',
    nullable: true,
    length: 15,
  })
  researchAssistantId: string;

  @Column('json', {
    name: 'sdgs',
    nullable: true,
  })
  sdgs?: ClarisaSdg[];

  @OneToMany(
    () => AgressoContractCountry,
    (agressoContract) => agressoContract.contract,
    { cascade: true },
  )
  countries?: AgressoContractCountry[];

  @OneToMany(
    () => UserAgressoContract,
    (userAgressoContract) => userAgressoContract.agressoContract,
  )
  userAgressoContracts?: UserAgressoContract[];

  @OneToMany(
    () => ResultContract,
    (resultContract) => resultContract.agresso_contract,
  )
  result_contracts?: ResultContract[];
}
