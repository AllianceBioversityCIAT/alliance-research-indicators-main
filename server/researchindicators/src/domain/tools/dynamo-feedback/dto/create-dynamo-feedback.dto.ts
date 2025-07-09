export class CreateDynamoFeedbackDto {
  user: {
    sec_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    user_role_list: Array<{
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
    }>;
    roleName: string;
  };
  description: string;
  issueType: number | number[];
  feedbackType: string;
  text: string;
}
