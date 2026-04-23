import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigService } from './app-config.service';
import { AppConfig } from './entities/app-config.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('AppConfigService', () => {
  let service: AppConfigService;
  const findOne = jest.fn();
  const update = jest.fn();

  const mockRepository = {
    findOne,
    update,
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue(mockRepository),
  };

  const mockCurrentUser = { user: { id: 1 }, audit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findConfigByKey', () => {
    it('should find active config by key', async () => {
      const row = { key: 'feature.x', is_active: true } as AppConfig;
      findOne.mockResolvedValue(row);

      const result = await service.findConfigByKey('feature.x');

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(AppConfig);
      expect(findOne).toHaveBeenCalledWith({
        where: { key: 'feature.x', is_active: true },
      });
      expect(result).toBe(row);
    });
  });

  describe('updateConfig', () => {
    it('should throw when config key is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        service.updateConfig('missing', { description: 'x' }),
      ).rejects.toThrow(NotFoundException);

      expect(update).not.toHaveBeenCalled();
    });

    it('should update allowed fields and return merged entity', async () => {
      const existing = {
        key: 'k1',
        description: 'old',
        simple_value: null,
        json_value: null,
      } as AppConfig;
      findOne.mockResolvedValue(existing);

      const result = await service.updateConfig('k1', {
        description: 'new desc',
        simple_value: 'v',
      });

      expect(update).toHaveBeenCalledWith('k1', {
        description: 'new desc',
        simple_value: 'v',
      });
      expect(result).toEqual({
        ...existing,
        description: 'new desc',
        simple_value: 'v',
      });
    });
  });
});
