import { ResultStatus } from './result-config.interface';

export class SubmissionHistoryItem {
  created_by_object = {
    first_name: '',
    last_name: ''
  };
  updated_at = '';
  from_status_id = 0;
  to_status_id = 0;
  from_status?: ResultStatus;
  to_status?: ResultStatus;
  submission_comment = '';
  custom_date = '';
  submission_history_id?: number;
  editable_timestamp?: boolean;
  is_editable_date?: boolean;
}
