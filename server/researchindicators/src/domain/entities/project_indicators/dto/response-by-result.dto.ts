export class ContractDto {
  agreement_id: string;
  description: string;
}

export class ResultContractsDto {
  result_id: string;
  result_official_code: string | null;
  result_title: string | null;
  contracts: ContractDto[];
}
