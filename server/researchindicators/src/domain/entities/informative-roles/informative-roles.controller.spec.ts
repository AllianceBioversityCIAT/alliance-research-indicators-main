import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InformativeRolesController } from './informative-roles.controller';
import { InformativeRolesService } from './informative-roles.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('InformativeRolesController', () => {
  let controller: InformativeRolesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InformativeRolesController],
      providers: [{ provide: InformativeRolesService, useValue: mockService }],
    }).compile();
    controller = module.get(InformativeRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find should use Informative Role label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Informative Role found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  it('findById should delegate to service', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
