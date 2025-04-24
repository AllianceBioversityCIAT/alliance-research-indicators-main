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
}

export class FindDataForSubmissionDto {
  contributor_id: number;
  contributor_email: string;
  pi_name: string;
  pi_email: string;
  result_id: number;
  title: string;
  project_name: string;
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
