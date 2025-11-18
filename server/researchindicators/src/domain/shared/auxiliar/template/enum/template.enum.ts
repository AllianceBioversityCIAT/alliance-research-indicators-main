export enum TemplateEnum {
  WELCOME_EMAIL = 'welcome-email',
  REVISE_RESULT = 'revise-result',
  REJECTED_RESULT = 'rejected-result',
  APPROVAL_RESULT = 'approval-result',
  SUBMITTED_RESULT = 'submitted-result',
  ASK_HELP_TECHNICAL = 'ask-help-technical',
  ASK_HELP_CONTENT = 'ask-help-content',
  OICR_NOTIFICATION_CREATED = 'oicr-notification-created',
  OICR_APPROVED = 'oicr-approved-result',
  OICR_POSTPONE = 'oicr-postpone-result',
  OICR_REJECTED = 'oicr-rejected-result',
}

export type WelcomeEmailTemplate = {
  client_host: string;
  first_name: string;
  last_name: string;
};
