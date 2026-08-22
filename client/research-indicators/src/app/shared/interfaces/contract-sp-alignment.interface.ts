export interface ContractSpAlignmentLink {
  result_official_code: string;
  result_title: string;
  role: 'PRIMARY' | 'CONTRIBUTING' | 'UNKNOWN';
}

export interface ContractSpAlignmentSp {
  sp_code: string;
  name: string;
  category: string | null;
  icon_key: string | null;
  links: ContractSpAlignmentLink[];
}

export interface ContractSpAlignmentReport {
  sps: ContractSpAlignmentSp[];
  results_with_alignment: number;
  results_without_alignment: number;
}
