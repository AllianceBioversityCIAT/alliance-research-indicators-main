import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IntellectualPropertyOwnersController } from './intellectual-property-owners.controller';
import { IntellectualPropertyOwnersService } from './intellectual-property-owners.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('IntellectualPropertyOwnersController', () => {
  let controller: IntellectualPropertyOwnersController;
  const mockService = { findAll: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntellectualPropertyOwnersController],
      providers: [
        {
          provide: IntellectualPropertyOwnersService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(IntellectualPropertyOwnersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll maps rows through mapper', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Intellectual property owners found',
      status: HttpStatus.OK,
      data: [],
    });
  });
});
