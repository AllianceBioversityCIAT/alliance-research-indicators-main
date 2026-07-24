export interface GetContracts {
  is_active: boolean;
  agreement_id: string;
  center_amount: string;
  center_amount_usd: string;
  client: string;
  contract_status: null | string;
  department: null | string;
  departmentId: null | string;
  description: string;
  division: null | string;
  divisionId: null | string;
  donor: null | string;
  is_science_program: boolean;
  donor_reference: null | string;
  endDateGlobal: null | string;
  endDatefinance: string;
  end_date: null | string;
  entity: null | string;
  extension_date: null | string;
  funding_type: null | string;
  grant_amount: string;
  lever_id: number;
  grant_amount_usd: string;
  project: null | string;
  projectDescription: null | string;
  project_lead_description: string;
  short_title: string;
  start_date: string;
  ubwClientDescription: string;
  unit: null | string;
  unitId: null | string;
  office: null | string;
  officeId: null | string;
  display_label: string;
  lever?: string;
  leverUrl?: string;
  select_label?: string;
}

export interface GetContractsExtended extends GetContracts {
  contract_id: string;
  levers?: {
    id: number;
    full_name: string;
    short_name: string;
    other_names: string;
    lever_url: string;
  };
}
