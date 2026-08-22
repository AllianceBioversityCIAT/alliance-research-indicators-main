export interface ContractResultsSummaryStatusBucket {
  status_id: number | null;
  name: string;
  count: number;
}

export interface ContractResultsSummaryYearBucket {
  year: number | null;
  count: number;
}

export interface ContractResultsSummaryIndicatorYearBucket {
  indicator_id: number;
  year: number | null;
  count: number;
}

export interface ContractResultsSummary {
  total: number;
  by_status: ContractResultsSummaryStatusBucket[];
  by_year: ContractResultsSummaryYearBucket[];
  by_indicator_year: ContractResultsSummaryIndicatorYearBucket[];
  partner_institutions: number;
}
