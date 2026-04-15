import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaCountriesController } from './clarisa-countries.controller';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaCountriesController', () => {
  let controller: ClarisaCountriesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaCountriesController],
      providers: [{ provide: ClarisaCountriesService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaCountriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find without sub-national filter', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find(undefined);
    expect(mockService.findAll).toHaveBeenCalledWith(undefined, undefined);
  });

  it('find with is-sub-national true applies where', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find(TrueFalseEnum.TRUE);
    expect(mockService.findAll).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        clarisa_sub_nationals: expect.any(Object),
      }),
    );
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: { id: 1 },
      description: 'Country found',
      status: HttpStatus.OK,
    });
  });
});
