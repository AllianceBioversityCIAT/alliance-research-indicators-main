import { FindContracts } from '../find-contracts.interface';

export type AgressoContractRow = FindContracts;

export interface PoolFundingTagPatchBody {
  is_pool_funding_contributor: boolean;
}

export interface PoolFundingTagPatchResponse {
  agreement_id: string;
  is_pool_funding_contributor: boolean;
  updated_at?: string;
}
