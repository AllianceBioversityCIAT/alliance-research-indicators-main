import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserSettingsService } from './user-settings.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UserSetting } from './entities/user-setting.entity';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  const mockFindOne = jest.fn();
  const mockFind = jest.fn();
  const mockSave = jest.fn();
  const mockCreate = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOne: mockFindOne,
              find: mockFind,
              save: mockSave,
              create: mockCreate,
            }),
          },
        },
        {
          provide: CurrentUserUtil,
          useValue: { user_id: 7 },
        },
      ],
    }).compile();

    service = module.get<UserSettingsService>(UserSettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 156
  describe('updateSettings', () => {
    it('should throw BadRequestException when component is empty', async () => {
      await expect(
        service.updateSettings('parent', '', { key: 'val' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update an existing setting when it already exists', async () => {
      const existing: Partial<UserSetting> = {
        user_id: 7,
        component: 'table',
        specific_component: 'pageSize',
        value: '10',
      };
      mockFindOne.mockResolvedValue(existing);
      mockSave.mockResolvedValue({ ...existing, value: '20' });

      await service.updateSettings('results', 'table', { pageSize: '20' });

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ value: '20' }),
      );
    });

    it('should create a new setting when it does not exist', async () => {
      mockFindOne.mockResolvedValue(null);
      const newSetting = { specific_component: 'pageSize', value: '50' };
      mockCreate.mockReturnValue(newSetting);
      mockSave.mockResolvedValue(newSetting);

      const result = await service.updateSettings('results', 'table', {
        pageSize: '50',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ specific_component: 'pageSize', value: '50' }),
      );
      expect(result).toEqual({ pageSize: '50' });
    });

    it('should return empty object when all keys already have existing settings', async () => {
      mockFindOne.mockResolvedValue({ value: 'old' });
      mockSave.mockResolvedValue(undefined);

      const result = await service.updateSettings('results', 'table', {
        pageSize: '5',
      });

      expect(result).toEqual({});
    });
  });

  // [CLAUDE/DONE] 157
  describe('findByUserIdAndComponent', () => {
    it('should return settings as a key-value map', async () => {
      const mockSettings: Partial<UserSetting>[] = [
        { specific_component: 'pageSize', value: '10' },
        { specific_component: 'theme', value: 'dark' },
      ];
      mockFind.mockResolvedValue(mockSettings);

      const result = await service.findByUserIdAndComponent(
        'results',
        'table',
      );

      expect(result).toEqual({ pageSize: '10', theme: 'dark' });
    });

    it('should include component in where clause when it is not empty', async () => {
      mockFind.mockResolvedValue([]);

      await service.findByUserIdAndComponent('results', 'table');

      const callArg = mockFind.mock.calls[0][0];
      expect(callArg.where.component).toBe('table');
    });

    it('should omit component from where clause when it is empty/null', async () => {
      mockFind.mockResolvedValue([]);

      await service.findByUserIdAndComponent('results', '');

      const callArg = mockFind.mock.calls[0][0];
      expect(callArg.where.component).toBeUndefined();
    });

    it('should return empty object when no settings found', async () => {
      mockFind.mockResolvedValue([]);

      const result = await service.findByUserIdAndComponent(
        'results',
        'filters',
      );

      expect(result).toEqual({});
    });
  });
});
