import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ToolFunctionsController } from './tool-functions.controller';
import { ToolFunctionsService } from './tool-functions.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ToolFunctionsController', () => {
  let controller: ToolFunctionsController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ToolFunctionsController],
      providers: [{ provide: ToolFunctionsService, useValue: mockService }],
    }).compile();
    controller = module.get(ToolFunctionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should format tool functions list', async () => {
      const data = [{ id: 1 }];
      mockService.findAll.mockResolvedValue(data);
      mockFormat.mockReturnValue({ wrapped: true });
      const out = await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tool functions found',
        status: HttpStatus.OK,
        data,
      });
      expect(out).toEqual({ wrapped: true });
    });
  });

  describe('findOne', () => {
    it('should format single tool function', async () => {
      const row = { id: 2 };
      mockService.findOne.mockResolvedValue(row);
      mockFormat.mockReturnValue({ row });
      const out = await controller.findOne('2');
      expect(mockService.findOne).toHaveBeenCalledWith(2);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tool function found',
        status: HttpStatus.OK,
        data: row,
      });
      expect(out).toEqual({ row });
    });
  });
});
