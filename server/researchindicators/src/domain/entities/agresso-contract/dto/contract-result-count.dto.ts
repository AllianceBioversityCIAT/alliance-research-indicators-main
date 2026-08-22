export class ContractCgiarEntityDto {
  code!: string;
  name!: string;
}

export class ContractResultIndicatorDto {
  indicator_id: number;
  name: string;
  description: string;
  indicator_type_id: number;
  long_description: string;
  icon_src: string;
  other_names: string;
  is_active: boolean;
  count_results: number;
}

export class ContractResultCountDto {
  agreement_id: string;
  projectDescription: string;
  project_lead_description: string;
  start_date: Date;
  end_date: Date;
  indicators: ContractResultIndicatorDto[];
  funding_type?: string | null;
  center_amount_usd?: number | null;
  grant_amount_usd?: number | null;
  sdgs?: any;
  contract_status?: string | null;
  status_name?: string | null;
  cgiar_entities?: ContractCgiarEntityDto[];
}
