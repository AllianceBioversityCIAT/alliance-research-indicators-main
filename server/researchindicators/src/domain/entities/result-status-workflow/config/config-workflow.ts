import { isEmpty } from 'lodash';
import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { DeepPartial } from 'typeorm';
import { Result } from '../../results/entities/result.entity';
import { AditionalDataChangeStatusDto } from '../dto/aditional-data.dto';

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
  custom_config_email: string;

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
  result: Result = null;
  configEmail: ConfigEmailDto = new ConfigEmailDto();
  customData: CustomDataDto = new CustomDataDto();
  aditionalData: AditionalDataChangeStatusDto =
    new AditionalDataChangeStatusDto();
}

export class ConfigEmailDto {
  to: string[] = [];
  cc: string[] = [];
  bcc: string[] = [];
  subject: string = null;
  body: string = null;
  rawTemplate: string = null;
  templateCode: string = null;
}

export class ContractCustomDataDto {
  code: string = null;
  title: string = null;
}

export class CustomDataDto {
  title?: string = null;
  oicr_number?: string = null;
  mel_expert_name?: string;
  requester_by?: string = null;
  sharepoint_url?: string = null;
  reviewed_by?: string = null;
  decision_date?: string = null;
  justification?: string = null;
  requester_by_email?: string = null;
  reviewed_by_email?: string = null;
  mel_expert_email?: string = null;
  result_id?: number = null;
  result_code?: string = null;
  platform_code?: string = null;
  support_email?: string = null;
  content_support_email?: string = null;
  system_name: string = null;
  rev_email?: string = null;
  url?: string = null;
  download_url?: string = null;
  created_at?: Date = null;
  contract: ContractCustomDataDto = new ContractCustomDataDto();
  principal_investigator: SimpleUserDto = new SimpleUserDto();
  action_executor: SimpleUserDto = new SimpleUserDto();
  submitter: SimpleUserDto = new SimpleUserDto();
  result_owner: SimpleUserDto = new SimpleUserDto();
  regional_expert: SimpleUserDto = new SimpleUserDto();
  indicator_name?: string = null;
  indicator_id?: number = null;
  description?: string = null;
  oicr_internal_code: string = null;
}

export class SimpleUserDto {
  name: string = null;
  email: string = null;
}
