export class FindGeneralDataTemplateDto {
  sub_last_name: string;
  sub_first_name: string;
  sub_email: string;
  rev_last_name: string;
  rev_first_name: string;
  rev_email: string;
  description: string;
  result_id: number;
  title: string;
  indicator: string;
}

export class FindGeneralCustomDataDto {
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  principal_investigator_first_name: string;
  principal_investigator_last_name: string;
  principal_investigator_email: string;
  result_official_code: string;
  result_id: number;
  result_title: string;
  project_name: string;
  indicator: string;
  action_executor_first_name: string;
  action_executor_last_name: string;
  action_executor_email: string;
  description: string;
  oicr_internal_code: string;
  project_code: string;
  created_at: Date;
  mel_regional_expert_first_name: string;
  mel_regional_expert_last_name: string;
  mel_regional_expert_email: string;
}

export class SubmissionEmailTemplateDataDto {
  pi_name: string;
  sub_last_name: string;
  sub_first_name: string;
  result_id: number;
  title: string;
  project_name: string;
  support_email: string;
}
