import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { BilateralController } from './bilateral.controller';
import { BilateralService } from './bilateral.service';
import { RESULT_OWNER_KEY } from '../../shared/decorators/result-owner.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ResultOwnerGuard } from '../../shared/guards/result-owner.guard';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils', () => ({
  ResponseUtils: {
    format: jest.fn((params) => params),
  },
}));

describe('BilateralController', () => {
  let controller: BilateralController;
  let service: jest.Mocked<BilateralService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      getAlignment: jest.fn(),
      deleteContribution: jest.fn(),
      listIndicators: jest.fn(),
      updateAlignment: jest.fn(),
      upsertContribution: jest.fn(),
    } as unknown as jest.Mocked<BilateralService>;
    controller = new BilateralController(service, {
      resultCode: 123,
    } as ResultsUtil);
  });

  it('can be instantiated with the service skeleton', () => {
    expect(controller).toBeInstanceOf(BilateralController);
  });

  it('is protected by RolesGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, BilateralController);

    expect(guards).toEqual(expect.arrayContaining([RolesGuard]));
  });

  it('declares Swagger bearer auth and Bilateral tag', () => {
    const tags = Reflect.getMetadata(DECORATORS.API_TAGS, BilateralController);
    const security = Reflect.getMetadata(
      DECORATORS.API_SECURITY,
      BilateralController,
    );

    expect(tags).toEqual(['Bilateral']);
    expect(security).toEqual([{ bearer: [] }]);
  });

  it('returns the pool funding alignment response envelope', async () => {
    const alignment = {
      result_code: '123',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      is_synced_to_prms: false,
      is_read_only: false,
    };
    const user = { sec_user_id: 9 } as any;
    service.getAlignment.mockResolvedValue(alignment);

    const result = await controller.getAlignment({ user } as any);

    expect(service.getAlignment).toHaveBeenCalledWith('123', user);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding alignment found',
      status: HttpStatus.OK,
      data: alignment,
    });
    expect(result).toEqual({
      description: 'Pool funding alignment found',
      status: HttpStatus.OK,
      data: alignment,
    });
  });

  it('declares Swagger operation and result-code param metadata', () => {
    const operation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      controller.getAlignment,
    );
    const parameters = Reflect.getMetadata(
      DECORATORS.API_PARAMETERS,
      controller.getAlignment,
    );

    expect(operation).toMatchObject({
      summary: 'Find pool funding alignment',
    });
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'path',
          name: 'resultCode',
          type: Number,
        }),
      ]),
    );
  });

  it('lists pool funding indicator groups with query filters', async () => {
    const groups = [
      {
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
        indicators: [],
      },
    ];
    const user = { sec_user_id: 9 } as any;
    service.listIndicators.mockResolvedValue(groups);

    const result = await controller.listIndicators(
      { user } as any,
      'rice',
      'outcome',
    );

    expect(service.listIndicators).toHaveBeenCalledWith(
      '123',
      { search: 'rice', indicator_type: 'outcome' },
      user,
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding indicators found',
      status: HttpStatus.OK,
      data: groups,
    });
    expect(result).toEqual({
      description: 'Pool funding indicators found',
      status: HttpStatus.OK,
      data: groups,
    });
  });

  it('declares Swagger query metadata on indicator listing', () => {
    const operation = Reflect.getMetadata(
      DECORATORS.API_OPERATION,
      controller.listIndicators,
    );
    const parameters = Reflect.getMetadata(
      DECORATORS.API_PARAMETERS,
      controller.listIndicators,
    );

    expect(operation).toMatchObject({
      summary: 'List pool funding indicators by selected SP',
    });
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ in: 'query', name: 'search' }),
        expect.objectContaining({ in: 'query', name: 'indicator-type' }),
      ]),
    );
  });

  it('updates the pool funding alignment response envelope', async () => {
    const alignment = {
      result_code: '123',
      eligible: true,
      has_pool_funding_alignment_eligible: true,
      has_contribution: true,
      selected_levers: [{ lever_code: 'SP01', lever_name: 'Adaptive crops' }],
      is_synced_to_prms: false,
      is_read_only: false,
    };
    const user = { sec_user_id: 9 } as any;
    const payload = { has_contribution: true, lever_codes: ['SP01'] };
    service.updateAlignment.mockResolvedValue(alignment);

    const result = await controller.updateAlignment({ user } as any, payload);

    expect(service.updateAlignment).toHaveBeenCalledWith('123', payload, user);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding alignment updated',
      status: HttpStatus.OK,
      data: alignment,
    });
    expect(result).toEqual({
      description: 'Pool funding alignment updated',
      status: HttpStatus.OK,
      data: alignment,
    });
  });

  it('creates an indicator contribution response envelope', async () => {
    const response = {
      result_code: '123',
      lever_code: 'SP01',
      lever_name: 'Adaptive crops',
      indicator_code: 'IND-1',
      indicator_type: 'capacity_sharing',
      is_stale: false,
    };
    const user = { sec_user_id: 9 } as any;
    const payload = { indicator_type: 'capacity_sharing' } as any;
    service.upsertContribution.mockResolvedValue(response);

    const result = await controller.createContribution(
      { user } as any,
      'IND-1',
      'SP01',
      payload,
    );

    expect(service.upsertContribution).toHaveBeenCalledWith(
      '123',
      'IND-1',
      payload,
      user,
      'SP01',
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding indicator contribution saved',
      status: HttpStatus.OK,
      data: response,
    });
    expect(result).toEqual({
      description: 'Pool funding indicator contribution saved',
      status: HttpStatus.OK,
      data: response,
    });
  });

  it('updates an indicator contribution response envelope', async () => {
    const response = {
      result_code: '123',
      lever_code: 'SP01',
      lever_name: 'Adaptive crops',
      indicator_code: 'IND-1',
      indicator_type: 'capacity_sharing',
      is_stale: false,
    };
    const user = { sec_user_id: 9 } as any;
    const payload = { indicator_type: 'capacity_sharing' } as any;
    service.upsertContribution.mockResolvedValue(response);

    const result = await controller.updateContribution(
      { user } as any,
      'IND-1',
      'SP01',
      payload,
    );

    expect(service.upsertContribution).toHaveBeenCalledWith(
      '123',
      'IND-1',
      payload,
      user,
      'SP01',
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding indicator contribution updated',
      status: HttpStatus.OK,
      data: response,
    });
    expect(result).toEqual({
      description: 'Pool funding indicator contribution updated',
      status: HttpStatus.OK,
      data: response,
    });
  });

  it('deletes an indicator contribution response envelope', async () => {
    const user = { sec_user_id: 9 } as any;
    service.deleteContribution.mockResolvedValue(undefined);

    const result = await controller.deleteContribution(
      { user } as any,
      'IND-1',
      'SP01',
    );

    expect(service.deleteContribution).toHaveBeenCalledWith(
      '123',
      'IND-1',
      user,
      'SP01',
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Pool funding indicator contribution deleted',
      status: HttpStatus.OK,
      data: null,
    });
    expect(result).toEqual({
      description: 'Pool funding indicator contribution deleted',
      status: HttpStatus.OK,
      data: null,
    });
  });

  it('declares owner guards and lever-code query metadata on contribution endpoints', () => {
    for (const handler of [
      controller.createContribution,
      controller.updateContribution,
      controller.deleteContribution,
    ]) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);
      const roles = Reflect.getMetadata(ROLES_KEY, handler);
      const ownerMetadata = Reflect.getMetadata(RESULT_OWNER_KEY, handler);
      const parameters = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        handler,
      );

      expect(guards).toEqual(
        expect.arrayContaining([RolesGuard, ResultOwnerGuard]),
      );
      expect(roles).toEqual([
        SecRolesEnum.CONTRIBUTOR,
        SecRolesEnum.CENTER_ADMIN,
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
      expect(ownerMetadata).toBeDefined();
      expect(parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ in: 'query', name: 'lever-code' }),
          expect.objectContaining({ in: 'path', name: 'indicatorCode' }),
        ]),
      );
    }
  });

  it('declares owner guard, roles, and Swagger body metadata on update', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      controller.updateAlignment,
    );
    const roles = Reflect.getMetadata(ROLES_KEY, controller.updateAlignment);
    const ownerMetadata = Reflect.getMetadata(
      RESULT_OWNER_KEY,
      controller.updateAlignment,
    );
    const parameters = Reflect.getMetadata(
      DECORATORS.API_PARAMETERS,
      controller.updateAlignment,
    );

    expect(guards).toEqual(
      expect.arrayContaining([RolesGuard, ResultOwnerGuard]),
    );
    expect(roles).toEqual([
      SecRolesEnum.CONTRIBUTOR,
      SecRolesEnum.CENTER_ADMIN,
      SecRolesEnum.SYSTEM_ADMIN,
    ]);
    expect(ownerMetadata).toBeDefined();
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'body',
        }),
      ]),
    );
  });
});
