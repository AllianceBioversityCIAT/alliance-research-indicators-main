import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaActorTypesController } from './clarisa-actor-types.controller';
import { ClarisaActorTypesService } from './clarisa-actor-types.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaActorTypesController', () => {
  let controller: ClarisaActorTypesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaActorTypesController],
      providers: [{ provide: ClarisaActorTypesService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaActorTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Actor types label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Actor types found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
