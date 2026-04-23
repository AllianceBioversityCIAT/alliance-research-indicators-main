import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInnovationTypesController } from './clarisa-innovation-types.controller';
import { ClarisaInnovationTypesService } from './clarisa-innovation-types.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInnovationTypesController', () => {
  let controller: ClarisaInnovationTypesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInnovationTypesController],
      providers: [
        { provide: ClarisaInnovationTypesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaInnovationTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Innovation types label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation types found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
