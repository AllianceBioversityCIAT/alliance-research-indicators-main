import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UserSettingsController } from './user-settings.controller';
import { UserSettingsService } from './user-settings.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('UserSettingsController', () => {
  let controller: UserSettingsController;
  const mockService = {
    findByUserIdAndComponent: jest.fn(),
    updateSettings: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSettingsController],
      providers: [{ provide: UserSettingsService, useValue: mockService }],
    }).compile();
    controller = module.get(UserSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findByUserIdAndComponent', async () => {
    const data = { theme: 'dark' };
    mockService.findByUserIdAndComponent.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.findByUserIdAndComponent('k', 'c');
    expect(mockService.findByUserIdAndComponent).toHaveBeenCalledWith('k', 'c');
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'User settings retrieved successfully',
      data,
      status: HttpStatus.OK,
    });
  });

  it('updateUserSettings', async () => {
    const body = { a: '1' };
    mockService.updateSettings.mockResolvedValue(body);
    mockFormat.mockReturnValue({});
    await controller.updateUserSettings('k', 'comp', body);
    expect(mockService.updateSettings).toHaveBeenCalledWith('k', 'comp', body);
  });
});
