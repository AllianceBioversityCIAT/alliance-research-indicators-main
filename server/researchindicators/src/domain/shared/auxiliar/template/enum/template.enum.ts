export enum TemplateEnum {
  WELCOME_EMAIL = 'welcome-email',
  REVISE_RESULT = 'revise-result',
  REJECTED_RESULT = 'rejected-result',
  APPROVAL_RESULT = 'approval-result',
}

export type WelcomeEmailTemplate = {
  client_host: string;
  first_name: string;
  last_name: string;
};
