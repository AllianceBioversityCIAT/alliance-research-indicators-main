import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { TempExternalOicrsController } from './temp_external_oicrs.controller';
import { TempExternalOicrsService } from './temp_external_oicrs.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('TempExternalOicrsController', () => {
  let controller: TempExternalOicrsController;
  const mockService = {
    findExternalOicrs: jest.fn(),
    mappingExternalOicrs: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TempExternalOicrsController],
      providers: [{ provide: TempExternalOicrsService, useValue: mockService }],
    }).compile();
    controller = module.get(TempExternalOicrsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    const rows = [];
    mockService.findExternalOicrs.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: rows,
      description: 'results found correctly',
      status: HttpStatus.OK,
    });
  });

  it('findMetadata', async () => {
    const meta = [];
    mockService.mappingExternalOicrs.mockResolvedValue(meta);
    mockFormat.mockReturnValue({});
    await controller.findMetadata(9);
    expect(mockService.mappingExternalOicrs).toHaveBeenCalledWith(9);
  });
});
