import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IpRightsApplicationOptionsController } from './ip-rights-application-options.controller';
import { IpRightsApplicationOptionsService } from './ip-rights-application-options.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('IpRightsApplicationOptionsController', () => {
  let controller: IpRightsApplicationOptionsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpRightsApplicationOptionsController],
      providers: [
        { provide: IpRightsApplicationOptionsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(IpRightsApplicationOptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses IP Rights Application Options label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'IP Rights Application Options found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
