import { GetSdgs } from './get-sdgs.interface';
import { GetLevers } from './get-levers.interface';
import { Lever } from './oicr-creation.interface';
import { PortfolioConfigItem } from './portfolio-config.interface';

export interface GetAllianceAlignment {
  contracts: Contract[];
  result_sdgs: GetSdgs[];
  primary_levers: Lever[];
  contributor_levers: Lever[];
  research_areas?: GetLevers[];
  strategic_objectives?: PortfolioConfigItem[];
  impact_outcomes?: PortfolioConfigItem[];
}

export interface AlignmentRequestParams {
  portfolioId?: number | null;
  return?: boolean;
}

interface Contract {
  is_active: boolean;
  result_contract_id: number;
  result_id: number;
  contract_id: string;
  contract_role_id: number;
  is_primary: boolean;
}
