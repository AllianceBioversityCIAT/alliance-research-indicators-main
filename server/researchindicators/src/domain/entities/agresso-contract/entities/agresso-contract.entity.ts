import { Entity, Column, OneToMany } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AgressoContractCountry } from '../../agresso-contract-countries/entities/agresso-contract-country.entity';

@Entity('agresso_contracts')
export class AgressoContract extends AuditableEntity {
  @Column('varchar', {
    primary: true,
    length: 36,
    name: 'agreement_id',
  })
  agreement_id!: string;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    name: 'center_amount',
    default: 0,
  })
  center_amount: number;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    default: 0,
    name: 'center_amount_usd',
  })
  center_amount_usd: number;

  @Column('varchar', {
    length: 15,
    name: 'client',
    nullable: true,
  })
  client?: string;

  @Column('varchar', {
    length: 20,
    name: 'contract_status',
    nullable: true,
  })
  contract_status?: string;

  @Column('varchar', {
    length: 100,
    name: 'department',
    nullable: true,
  })
  department?: string;

  @Column('varchar', {
    length: 10,
    name: 'departmentId',
    nullable: true,
  })
  departmentId?: string;

  @Column('varchar', {
    length: 200,
    name: 'description',
    nullable: true,
  })
  description?: string;

  @Column('varchar', {
    length: 30,
    name: 'division',
    nullable: true,
  })
  division?: string;

  @Column('varchar', {
    length: 10,
    name: 'divisionId',
    nullable: true,
  })
  divisionId?: string;

  @Column('varchar', {
    length: 100,
    name: 'donor',
    nullable: true,
  })
  donor?: string;

  @Column('varchar', {
    length: 20,
    name: 'donor_reference',
    nullable: true,
  })
  donor_reference?: string;

  @Column('timestamp', {
    name: 'endDateGlobal',
    nullable: true,
  })
  endDateGlobal?: Date;

  @Column('timestamp', {
    name: 'endDatefinance',
    nullable: true,
  })
  endDatefinance?: Date;

  @Column('timestamp', {
    name: 'end_date',
    nullable: true,
  })
  end_date?: Date;

  @Column('varchar', {
    length: 10,
    name: 'entity',
    nullable: true,
  })
  entity?: string;

  @Column('timestamp', {
    name: 'extension_date',
    nullable: true,
  })
  extension_date?: Date;

  @Column('varchar', {
    length: 10,
    name: 'funding_type',
    nullable: true,
  })
  funding_type?: string;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    default: 0,
    name: 'grant_amount',
  })
  grant_amount: number;

  @Column('decimal', {
    precision: 11,
    scale: 2,
    default: 0,
    name: 'grant_amount_usd',
  })
  grant_amount_usd: number;

  @Column('varchar', {
    length: 10,
    name: 'project',
    nullable: true,
  })
  project?: string;

  @Column('varchar', {
    length: 20,
    name: 'projectDescription',
    nullable: true,
  })
  projectDescription?: string;

  @Column('varchar', {
    length: 50,
    name: 'project_lead_description',
    nullable: true,
  })
  project_lead_description?: string;

  @Column('varchar', {
    length: 50,
    name: 'short_title',
    nullable: true,
  })
  short_title?: string;

  @Column('timestamp', {
    name: 'start_date',
    nullable: true,
  })
  start_date?: Date;

  @Column('varchar', {
    length: 50,
    name: 'ubwClientDescription',
    nullable: true,
  })
  ubwClientDescription?: string;

  @Column('varchar', {
    length: 100,
    name: 'unit',
    nullable: true,
  })
  unit?: string;

  @Column('varchar', {
    length: 10,
    name: 'unitId',
    nullable: true,
  })
  unitId?: string;

  @OneToMany(
    () => AgressoContractCountry,
    (agressoContract) => agressoContract.contract,
    { cascade: true },
  )
  countries?: AgressoContractCountry[];
}
