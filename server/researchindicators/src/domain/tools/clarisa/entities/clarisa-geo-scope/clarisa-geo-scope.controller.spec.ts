import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaGeoScopeController } from './clarisa-geo-scope.controller';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaGeoScopeController', () => {
  let controller: ClarisaGeoScopeController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGeoScopeController],
      providers: [{ provide: ClarisaGeoScopeService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaGeoScopeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: [],
      description: 'Geo scopes found',
      status: HttpStatus.OK,
    });
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
