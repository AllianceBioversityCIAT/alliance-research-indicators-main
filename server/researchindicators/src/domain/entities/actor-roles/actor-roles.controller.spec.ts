import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ActorRolesController } from './actor-roles.controller';
import { ActorRolesService } from './actor-roles.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ActorRolesController', () => {
  let controller: ActorRolesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActorRolesController],
      providers: [{ provide: ActorRolesService, useValue: mockService }],
    }).compile();
    controller = module.get(ActorRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find formats Actor roles', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Actor roles found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  it('findById delegates', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
