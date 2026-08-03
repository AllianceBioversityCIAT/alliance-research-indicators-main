export interface DynamoFeedbackRole {
  created_at: string;
  updated_at: string;
  is_active: boolean;
  sec_user_role_id: number;
  user_id: number;
  role_id: number;
  role: {
    created_at: string;
    updated_at: string;
    is_active: boolean;
    justification_update: string | null;
    sec_role_id: number;
    name: string;
    focus_id: number;
  };
}

export interface DynamoFeedbackUser {
  sec_user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  user_role_list: DynamoFeedbackRole[];
  roleName: string;
}

export interface DynamoFeedback {
  user: DynamoFeedbackUser;
  description: string;
  issueType: number;
  feedbackType: string;
  text: string;
}
