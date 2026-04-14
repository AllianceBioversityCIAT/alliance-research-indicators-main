import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementSettingsService } from './announcement-settings.service';
import { AnnouncementSettingRepository } from './repositories/announcement-setting.repository';

describe('AnnouncementSettingsService', () => {
  let service: AnnouncementSettingsService;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementSettingsService,
        {
          provide: AnnouncementSettingRepository,
          useValue: { find },
        },
      ],
    }).compile();

    service = module.get<AnnouncementSettingsService>(
      AnnouncementSettingsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableAnnouncements', () => {
    it('should return active announcement settings', async () => {
      const rows = [{ id: 1 }];
      find.mockResolvedValue(rows);

      const result = await service.getAvailableAnnouncements();

      expect(find).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      expect(result).toBe(rows);
    });
  });
});
