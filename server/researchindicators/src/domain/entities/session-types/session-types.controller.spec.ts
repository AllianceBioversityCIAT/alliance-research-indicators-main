import { Test, TestingModule } from '@nestjs/testing';
import { SessionTypesController } from './session-types.controller';
import { SessionTypesService } from './session-types.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('SessionTypesController', () => {
  let controller: SessionTypesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionTypesController],
      providers: [{ provide: SessionTypesService, useValue: mockService }],
    }).compile();
    controller = module.get(SessionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return formatted session types', async () => {
      const data = [{ id: 1 }];
      mockService.findAll.mockResolvedValue(data);
      mockFormat.mockReturnValue({ ok: 1 });
      await controller.findAll();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Session types found',
        status: 200,
        data,
      });
    });
  });

  describe('findOne', () => {
    it('should return formatted session type by id', async () => {
      mockService.findOne.mockResolvedValue({ id: 9 });
      mockFormat.mockReturnValue({ ok: 2 });
      await controller.findOne('9');
      expect(mockService.findOne).toHaveBeenCalledWith(9);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Session type found',
        status: 200,
        data: { id: 9 },
      });
    });
  });
});
