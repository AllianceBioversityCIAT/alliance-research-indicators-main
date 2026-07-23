export interface SubmissionHistoryItem {
  submission_history_id: number;
  result_id: number;
  from_status_id: number;
  to_status_id: number;
  submission_comment: string;
  is_active: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  result: {
    title: string;
    result_id: number;
    version_id: number | null;
    description: string;
    geo_scope_id: number;
    indicator_id: number;
    report_year_id: number;
    result_status_id: number;
    result_official_code: number;
  };
  from_status: {
    name: string;
    result_status_id: number;
  };
  to_status: {
    name: string;
    result_status_id: number;
  };
  created_by_object: {
    email: string;
    is_active: number;
    last_name: string;
    first_name: string;
    sec_user_id: number;
  };
}
