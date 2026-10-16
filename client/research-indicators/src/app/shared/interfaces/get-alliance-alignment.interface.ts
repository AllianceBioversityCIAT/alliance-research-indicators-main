import { GetSdgs } from './get-sdgs.interface';
import { GetLevers } from './get-levers.interface';
import { Lever } from './oicr-creation.interface';
import { PortfolioConfigItem } from './portfolio-config.interface';
import { ResultLeverSdgTargetPayload } from './lever-sdg-target.interface';

export interface GetAllianceAlignment {
  contracts: Contract[];
  result_sdgs: GetSdgs[];
  primary_levers: Lever[];
  contributor_levers: Lever[];
  research_areas?: GetLevers[];
  strategic_objectives?: PortfolioConfigItem[];
  impact_outcomes?: PortfolioConfigItem[];
  /** Portfolio 2026 OICR SDG targets. Independent of research areas. */
  result_sdg_targets?: ResultLeverSdgTargetPayload[];
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
