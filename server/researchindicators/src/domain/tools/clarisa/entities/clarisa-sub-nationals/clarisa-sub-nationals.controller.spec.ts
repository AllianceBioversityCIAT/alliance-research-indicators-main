import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaSubNationalsController } from './clarisa-sub-nationals.controller';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaSubNationalsController', () => {
  let controller: ClarisaSubNationalsController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findSubNationalsByCountryIso2: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaSubNationalsController],
      providers: [
        { provide: ClarisaSubNationalsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaSubNationalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Subnationals found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });

  it('findSubNationalsByCountryIso2', async () => {
    mockService.findSubNationalsByCountryIso2.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findSubNationalsByCountryIso2('CO');
    expect(mockService.findSubNationalsByCountryIso2).toHaveBeenCalledWith(
      'CO',
    );
  });
});
