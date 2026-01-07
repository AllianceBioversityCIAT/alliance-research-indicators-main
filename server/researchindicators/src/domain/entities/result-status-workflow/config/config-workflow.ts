import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';

export interface ConfigWorkflow {
  actions: ConfigWorkflowAction[];
}

export interface ConfigWorkflowAction {
  type: ConfigWorkFlowTypeEnum;
  enabled: boolean;
  config: ConfigWorkflowActionEmail | ConfigWorkflowActionFunction;
}

export interface ConfigWorkflowActionEmail {
  template: TemplateEnum;
  custom_data_resolver: string;
}

export interface ConfigWorkflowActionFunction {
  function_name: string;
}

export enum ConfigWorkFlowTypeEnum {
  FUNCTION = 'function',
  EMAIL = 'email',
}

export class ConfigWorkflowDto implements ConfigWorkflow {
  public actions: ConfigWorkflowAction[] = [];
  constructor(...actions: ConfigWorkflowAction[]) {
    this.actions = actions ?? [];
  }

  get jsonObject(): string {
    return JSON.stringify(this);
  }
}
