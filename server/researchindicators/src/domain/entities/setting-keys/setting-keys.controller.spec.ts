import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SettingKeysController } from './setting-keys.controller';
import { SettingKeysService } from './setting-keys.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('SettingKeysController', () => {
  let controller: SettingKeysController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingKeysController],
      providers: [{ provide: SettingKeysService, useValue: mockService }],
    }).compile();
    controller = module.get(SettingKeysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find should format with dataName', async () => {
    const data = [];
    mockService.findAll.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Innovation types found',
      data,
      status: HttpStatus.OK,
    });
  });

  it('findById should call findOne with numeric id', async () => {
    mockService.findOne.mockResolvedValue(null);
    mockFormat.mockReturnValue({});
    await controller.findById('12');
    expect(mockService.findOne).toHaveBeenCalledWith(12);
  });
});
