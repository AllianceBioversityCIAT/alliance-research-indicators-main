import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import {
  ConfigEmailDto,
  ConfigWorkflowAction,
  ConfigWorkflowActionEmail,
  ConfigWorkflowActionFunction,
  ConfigWorkflowDto,
  ConfigWorkFlowTypeEnum,
  CustomDataDto,
  GeneralDataDto,
  SimpleUserDto,
} from './config-workflow';

describe('ConfigWorkflowAction', () => {
  it('does not assign type when data.type is empty (early return; new still returns this)', () => {
    const action = new ConfigWorkflowAction({});
    expect(action).toBeInstanceOf(ConfigWorkflowAction);
    expect((action as ConfigWorkflowAction).type).toBeUndefined();
    expect((action as ConfigWorkflowAction).config).toBeUndefined();
  });

  it('builds FUNCTION config', () => {
    const action = new ConfigWorkflowAction({
      type: ConfigWorkFlowTypeEnum.FUNCTION,
      enabled: true,
      config: { function_name: 'doThing' } as ConfigWorkflowActionFunction,
    });

    expect(action.type).toBe(ConfigWorkFlowTypeEnum.FUNCTION);
    expect(action.enabled).toBe(true);
    expect(action.config).toBeInstanceOf(ConfigWorkflowActionFunction);
    expect((action.config as ConfigWorkflowActionFunction).function_name).toBe(
      'doThing',
    );
  });

  it('builds EMAIL config', () => {
    const action = new ConfigWorkflowAction({
      type: ConfigWorkFlowTypeEnum.EMAIL,
      enabled: false,
      config: {
        template: TemplateEnum.WELCOME_EMAIL,
        custom_data_resolver: 'resolver.path',
      } as ConfigWorkflowActionEmail,
    });

    expect(action.type).toBe(ConfigWorkFlowTypeEnum.EMAIL);
    expect(action.config).toBeInstanceOf(ConfigWorkflowActionEmail);
    expect((action.config as ConfigWorkflowActionEmail).template).toBe(
      TemplateEnum.WELCOME_EMAIL,
    );
    expect(
      (action.config as ConfigWorkflowActionEmail).custom_data_resolver,
    ).toBe('resolver.path');
  });
});

describe('ConfigWorkflowDto', () => {
  it('maps actions, keeps instances with class fields (lodash isEmpty) and exposes jsonObject', () => {
    const dto = new ConfigWorkflowDto(
      {},
      {
        type: ConfigWorkFlowTypeEnum.FUNCTION,
        enabled: true,
        config: { function_name: 'x' } as ConfigWorkflowActionFunction,
      },
    );

    expect(dto.actions.length).toBeGreaterThanOrEqual(1);
    const fnAction = dto.actions.find(
      (a) => a.type === ConfigWorkFlowTypeEnum.FUNCTION,
    );
    expect(fnAction).toBeDefined();
    expect(fnAction!.config).toBeInstanceOf(ConfigWorkflowActionFunction);
    expect(dto.jsonObject).toContain('"actions"');
  });
});

describe('DTO helpers', () => {
  it('GeneralDataDto nests default collaborators', () => {
    const g = new GeneralDataDto();
    expect(g.configEmail).toBeInstanceOf(ConfigEmailDto);
    expect(g.customData).toBeInstanceOf(CustomDataDto);
    expect(g.aditionalData).toBeDefined();
    expect(g.history).toBeDefined();
  });

  it('SimpleUserDto and ConfigEmailDto accept defaults', () => {
    const u = new SimpleUserDto();
    expect(u.name).toBeNull();
    const mail = new ConfigEmailDto();
    expect(mail.isAvailableToSend).toBe(true);
    expect(mail.to).toEqual([]);
  });
});
