import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AnnouncementSettingsController } from './announcement-settings.controller';
import { AnnouncementSettingsService } from './announcement-settings.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('AnnouncementSettingsController', () => {
  let controller: AnnouncementSettingsController;
  const mockService = { getAvailableAnnouncements: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementSettingsController],
      providers: [
        { provide: AnnouncementSettingsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(AnnouncementSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAvailableAnnouncements', async () => {
    const data = [];
    mockService.getAvailableAnnouncements.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.getAvailableAnnouncements();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Get available announcements',
      data,
      status: HttpStatus.OK,
    });
  });
});
