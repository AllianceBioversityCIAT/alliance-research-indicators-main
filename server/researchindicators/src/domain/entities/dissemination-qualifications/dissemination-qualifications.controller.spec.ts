import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DisseminationQualificationsController } from './dissemination-qualifications.controller';
import { DisseminationQualificationsService } from './dissemination-qualifications.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('DisseminationQualificationsController', () => {
  let controller: DisseminationQualificationsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisseminationQualificationsController],
      providers: [
        {
          provide: DisseminationQualificationsService,
          useValue: mockService,
        },
      ],
    }).compile();
    controller = module.get(DisseminationQualificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Dissemination qualifications found',
      status: HttpStatus.OK,
      data: [],
    });
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findOne('2');
    expect(mockService.findOne).toHaveBeenCalledWith(2);
  });
});
