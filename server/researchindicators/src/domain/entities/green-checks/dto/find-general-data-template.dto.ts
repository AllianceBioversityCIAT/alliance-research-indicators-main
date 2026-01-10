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

export class FindDataForSubmissionDto {
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_email: string;
  principal_investigator_first_name: string;
  principal_investigator_last_name: string;
  principal_investigator_name: string;
  result_official_code: string;
  result_id: number;
  result_title: string;
  project_name: string;
  indicator: string;
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
