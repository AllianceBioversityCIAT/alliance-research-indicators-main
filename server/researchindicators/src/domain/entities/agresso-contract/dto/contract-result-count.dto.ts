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
}
