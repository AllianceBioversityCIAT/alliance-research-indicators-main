export interface InteractionFeedbackPayload {
  user_id: string;
  service_name: string;
  update_mode: boolean;
  interaction_id: string | null;
  feedback_type: 'positive' | 'negative' | null;
  feedback_comment: string;
}


