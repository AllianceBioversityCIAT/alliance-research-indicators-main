import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { LeverSdgTargetsController } from './lever-sdg-targets.controller';
import { LeverSdgTargetsService } from './lever-sdg-targets.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';

jest.mock('../../shared/utils/response.utils');

describe('LeverSdgTargetsController', () => {
  let controller: LeverSdgTargetsController;
  const mockService = {
    createDataTransaction: jest.fn(),
    softDelete: jest.fn(),
    findByLeverId: jest.fn(),
    findAll: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeverSdgTargetsController],
      providers: [
        { provide: LeverSdgTargetsService, useValue: mockService },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(LeverSdgTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create', async () => {
    const dto = { lever_id: 1 } as any;
    const created = { id: 1 };
    mockService.createDataTransaction.mockResolvedValue(created);
    mockFormat.mockReturnValue({});
    await controller.create(dto);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Lever Sdg Target created successfully',
      data: created,
      status: HttpStatus.CREATED,
    });
  });

  it('delete', async () => {
    mockService.softDelete.mockResolvedValue({ affected: 1 });
    mockFormat.mockReturnValue({});
    await controller.delete(5 as any);
    expect(mockService.softDelete).toHaveBeenCalledWith(5);
  });

  it('findByLeverId with only_sdg_targets false', async () => {
    mockService.findByLeverId.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findByLeverId(3, TrueFalseEnum.FALSE);
    expect(mockService.findByLeverId).toHaveBeenCalledWith(3, false);
  });

  it('findByLeverId with only_sdg_targets true', async () => {
    mockService.findByLeverId.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findByLeverId(3, TrueFalseEnum.TRUE);
    expect(mockService.findByLeverId).toHaveBeenCalledWith(3, true);
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'List of all Lever Sdg Targets',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
