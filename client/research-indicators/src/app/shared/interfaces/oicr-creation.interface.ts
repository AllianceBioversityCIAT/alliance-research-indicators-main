import { Country, Region } from './get-geo-location.interface';
import { ResultImpactArea } from './impact-area.interface';
import { ResultStatus } from './result-config.interface';
import { GetSdgs } from './get-sdgs.interface';
import { ResultLeverSdgTargetPayload } from './lever-sdg-target.interface';

export interface OicrCreation {
  step_one: StepOne;
  step_two: StepTwo;
  step_three: StepThree;
  step_four: StepFour;
  base_information: BaseInformation;
  cgspace_link?: string | null;
}

export interface BaseInformation {
  indicator_id: number;
  contract_id: string;
  title: string;
  description: string;
  year: string;
  is_ai: boolean;
}

export interface MainContactPerson {
  result_user_id: string;
  result_id: number;
  user_id: string;
  user_role_id: number;
}

export interface Tagging {
  tag_id: number;
}

export interface StepOne {
  main_contact_person: MainContactPerson;
  tagging: Tagging;
  link_result: LinkResult;
  outcome_impact_statement: string;
}

export interface Initiative {
  clarisa_initiative_id: number;
}

export interface Lever {
  result_lever_id: number;
  result_id: number;
  lever_id: string | number;
  lever_role_id: number;
  is_primary: boolean;
  result_lever_strategic_outcomes?: LeverStrategicOutcome[];
  result_lever_sdgs?: GetSdgs[];
  /** Primary levers: PATCH uses this list (not result_lever_sdgs). */
  result_lever_sdg_targets?: ResultLeverSdgTargetPayload[];
  custom_lever_name?: string;
  icon?: string;
  short_name?: string;
  other_names?: string;
}
/** Saved on result; list rows from GET lever-strategic-outcome/by-lever/:lever_id also include id + strategic_outcome. */
export interface LeverStrategicOutcome {
  lever_strategic_outcome_id: number;
  id?: number;
  strategic_outcome?: string;
}
export interface StepTwo {
  primary_lever: Lever[];
  contributor_lever: Lever[];
}

export interface ResultCountrySubNational {
  result_country_sub_national_id: number;
  result_country_id: number;
  sub_national_id: number;
}

export interface StepThree {
  geo_scope_id?: number;
  countries: Country[];
  regions: Region[];
  comment_geo_scope: string;
}

export interface GeneralComment {
  comment_geo_scope: string;
}

export interface StepFour {
  general_comment: string;
}

/** Table an existing OICR comes from: TEMP_external_oicrs (external) or results (result). */
export type ExistingOicrSource = 'external' | 'result';

export interface LinkResult {
  result_id?: number;
  external_oicr_id: number;
  /** Absent on links saved before OICRs from results could be selected — those are 'external'. */
  source?: ExistingOicrSource;
}

export interface PatchOicr {
  oicr_internal_code: string;
  tagging: Tagging;
  sharepoint_link: string;
  mel_regional_expert_id?: string;
  outcome_impact_statement: string;
  short_outcome_impact_statement: string;
  general_comment?: string;
  maturity_level_id: number;
  link_result: LinkResult;
  actual_count?: QuantificationPayload[];
  extrapolate_estimates?: QuantificationPayload[];
  notable_references?: NotableReferencePayload[];
  result_impact_areas?: ResultImpactArea[];
  for_external_use: boolean;
  for_external_use_description: string;
}

export interface QuantificationPayload {
  quantification_number: number | string;
  unit: string;
  description: string;
}

export interface NotableReferencePayload {
  notable_reference_type_id: number | null;
  link: string;
}

export interface Oicr {
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  id: number;
  /** Sent by GET temp/oicrs; treated as 'external' when absent. */
  source?: ExistingOicrSource;
  title: string;
  result_status: string;
  /** Status with its display config (colors, icon, description); null when it cannot be resolved. */
  status?: ResultStatus | null;
  maturity_level: string;
  report_year: string;
  external_id?: string;
  handle_link?: string | null;
}
