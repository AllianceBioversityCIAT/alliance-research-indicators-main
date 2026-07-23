import { ResultStatus } from "./result-config.interface";

export interface LeverData {
  id: number;
  full_name: string;
  short_name: string;
  other_names: string;
  lever_url: string;
}

export interface OicrHeaderData {
  title?: string;
  result_official_code?: string | number;
  agreement_id?: string;
  description?: string;
  project_lead_description?: string;
  start_date?: string | Date;
  endDateGlobal?: string | Date;
  lever?: string;
  leverUrl?: string;
  leverFirst?: string;
  leverSecond?: string;
  levers?: LeverData;
  status_id?: string;
  status_name?: string;
  status_config?: ResultStatus;
}


