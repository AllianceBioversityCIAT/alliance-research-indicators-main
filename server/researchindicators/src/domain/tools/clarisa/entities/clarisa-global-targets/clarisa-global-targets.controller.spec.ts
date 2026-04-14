import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaGlobalTargetsController } from './clarisa-global-targets.controller';
import { ClarisaGlobalTargetsService } from './clarisa-global-targets.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaGlobalTargetsController', () => {
  let controller: ClarisaGlobalTargetsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGlobalTargetsController],
      providers: [
        { provide: ClarisaGlobalTargetsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaGlobalTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Clarisa Global Target label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Clarisa Global Target found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
