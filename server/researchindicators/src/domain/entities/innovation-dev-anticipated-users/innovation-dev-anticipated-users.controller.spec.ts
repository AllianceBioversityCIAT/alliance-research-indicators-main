import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InnovationDevAnticipatedUsersController } from './innovation-dev-anticipated-users.controller';
import { InnovationDevAnticipatedUsersService } from './innovation-dev-anticipated-users.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('InnovationDevAnticipatedUsersController', () => {
  let controller: InnovationDevAnticipatedUsersController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationDevAnticipatedUsersController],
      providers: [
        {
          provide: InnovationDevAnticipatedUsersService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(InnovationDevAnticipatedUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses full dataName', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation development anticipated users found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
