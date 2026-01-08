import { isEmpty } from 'lodash';
import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { DeepPartial } from 'typeorm';
import { Result } from '../../results/entities/result.entity';

export interface ConfigWorkflow {
  actions: ConfigWorkflowAction[];
}

export class ConfigWorkflowAction {
  type: ConfigWorkFlowTypeEnum;
  enabled: boolean;
  config: ConfigWorkflowActionEmail | ConfigWorkflowActionFunction;

  private _getConfig = {
    [ConfigWorkFlowTypeEnum.FUNCTION]: (data: ConfigWorkflowActionFunction) => {
      return new ConfigWorkflowActionFunction(data);
    },
    [ConfigWorkFlowTypeEnum.EMAIL]: (data: ConfigWorkflowActionEmail) => {
      return new ConfigWorkflowActionEmail(data);
    },
  };

  constructor(data: DeepPartial<ConfigWorkflowAction>) {
    if (isEmpty(data?.type)) return null;
    this.type = data?.type;
    this.enabled = data?.enabled;
    this.config = this._getConfig?.[data?.type](data?.config as any);
  }
}

export class ConfigWorkflowActionEmail {
  template: TemplateEnum;
  custom_data_resolver: string;

  constructor(data: ConfigWorkflowActionEmail) {
    this.template = data?.template;
    this.custom_data_resolver = data?.custom_data_resolver;
  }
}

export class ConfigWorkflowActionFunction {
  function_name: string;

  constructor(data: ConfigWorkflowActionFunction) {
    this.function_name = data?.function_name;
  }
}

export enum ConfigWorkFlowTypeEnum {
  FUNCTION = 'function',
  EMAIL = 'email',
  VALIDATION = 'validation',
}

export class ConfigWorkflowDto implements ConfigWorkflow {
  public actions: ConfigWorkflowAction[] = [];
  constructor(...actions: DeepPartial<ConfigWorkflowAction>[]) {
    this.actions = actions
      .map((el) => new ConfigWorkflowAction(el))
      .filter((el) => !isEmpty(el));
  }

  get jsonObject(): string {
    return JSON.stringify(this);
  }
}

export class GeneralDataDto {
  result: Result;
  template: string;
  customData?: {
    title?: string;
    oicr_number?: string;
    mel_expert_name?: string;
    requester_by?: string;
    sharepoint_url?: string;
    reviewed_by?: string;
    decision_date?: string;
    justification?: string;
    requester_by_email?: string;
    reviewed_by_email?: string;
    mel_expert_email?: string;
    pi_name?: string;
    sub_last_name?: string;
    sub_first_name?: string;
    result_id?: number;
    result_code?: string;
    platform_code?: string;
    project_name?: string;
    support_email?: string;
    content_support_email?: string;
    system_name: string;
    rev_email?: string;
    url?: string;
    indicator?: string;
  };
}
