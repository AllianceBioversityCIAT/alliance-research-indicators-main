import { Test, TestingModule } from '@nestjs/testing';
import { SessionFormatsController } from './session-formats.controller';
import { SessionFormatsService } from './session-formats.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('SessionFormatsController', () => {
  let controller: SessionFormatsController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionFormatsController],
      providers: [{ provide: SessionFormatsService, useValue: mockService }],
    }).compile();
    controller = module.get(SessionFormatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findAll();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Session formats found',
      status: 200,
      data: [],
    });
  });

  it('findOne', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findOne('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
