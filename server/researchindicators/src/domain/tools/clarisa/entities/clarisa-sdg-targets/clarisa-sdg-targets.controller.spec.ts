import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaSdgTargetsController } from './clarisa-sdg-targets.controller';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaSdgTargetsController', () => {
  let controller: ClarisaSdgTargetsController;
  const mockFindAll = jest.fn();
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSdgTargetsController],
      providers: [
        {
          provide: ClarisaSdgTargetsService,
          useValue: { findAll: mockFindAll },
        },
      ],
    }).compile();
    controller = module.get(ClarisaSdgTargetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll returns formatted service response', async () => {
    const rows = [{ id: 1n, sdg_target_code: '1.1' }];
    mockFindAll.mockResolvedValue(rows);
    const formatted = {
      description: 'SDG Targets found',
      status: HttpStatus.OK,
      data: rows,
    };
    mockFormat.mockReturnValue(formatted);

    const result = await controller.findAll();

    expect(mockFindAll).toHaveBeenCalledWith();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: rows,
      description: 'SDG Targets found',
      status: HttpStatus.OK,
    });
    expect(result).toBe(formatted);
  });
});
