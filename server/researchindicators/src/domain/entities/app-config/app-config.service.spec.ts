import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigService } from './app-config.service';
import { AppConfig } from './entities/app-config.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AppConfigRepository } from './repositories/app-config.repository';
import { AppConfigSorting } from './enum/app-config-forting.enum';
import { AppConfigKey } from './enum/app-config-key.enum';
import { AppConfigTypesDto } from './dtos/app-config-types.dto';

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

  const mockCurrentUser = {
    user: { id: 1 },
    audit: jest.fn().mockReturnValue({ updated_by: 1 }),
  };
  const mockAppConfigRepository = {
    findAll: jest.fn(),
    findAllCategoriesAndSubcategories: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: AppConfigRepository, useValue: mockAppConfigRepository },
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

  describe('getAllConfigs', () => {
    it('should delegate to AppConfigRepository.findAll', async () => {
      const payload = {
        data: [{ key: 'k1' }] as AppConfig[],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          pageSize: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockAppConfigRepository.findAll.mockResolvedValue(payload);

      const result = await service.getAllConfigs(
        { category: 'EMAIL' },
        { field: AppConfigSorting.KEY, order: 'DESC' },
        { page: 1, limit: 20 },
        'test',
      );

      expect(mockAppConfigRepository.findAll).toHaveBeenCalledWith(
        { category: 'EMAIL' },
        { field: AppConfigSorting.KEY, order: 'DESC' },
        { page: 1, limit: 20 },
        'test',
      );
      expect(result).toBe(payload);
    });

    it('should default sorting to empty object when omitted', async () => {
      mockAppConfigRepository.findAll.mockResolvedValue([]);

      await service.getAllConfigs({ category: 'EMAIL' });

      expect(mockAppConfigRepository.findAll).toHaveBeenCalledWith(
        { category: 'EMAIL' },
        {},
        undefined,
        undefined,
      );
    });
  });

  describe('getCategoriesAndSubcategories', () => {
    it('should delegate to AppConfigRepository.findAllCategoriesAndSubcategories', async () => {
      const lists = {
        categories: ['EMAIL'],
        subcategories: ['READINESS_LEVEL_7'],
      };
      mockAppConfigRepository.findAllCategoriesAndSubcategories.mockResolvedValue(
        lists,
      );

      const result = await service.getCategoriesAndSubcategories();

      expect(
        mockAppConfigRepository.findAllCategoriesAndSubcategories,
      ).toHaveBeenCalled();
      expect(result).toBe(lists);
    });
  });

  describe('getEnv', () => {
    it('should return typed config values when key exists', async () => {
      const row = {
        key: AppConfigKey.ARI_CLARISA_API_KEY,
        simple_value: 'secret-key',
        json_value: { enabled: true },
      } as AppConfig;
      findOne.mockResolvedValue(row);

      const result = await service.getEnv(AppConfigKey.ARI_CLARISA_API_KEY);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          key: AppConfigKey.ARI_CLARISA_API_KEY,
          is_active: true,
        },
      });
      expect(result).toEqual(
        new AppConfigTypesDto({
          simple_value: 'secret-key',
          json_value: { enabled: true },
        } as AppConfig),
      );
    });

    it('should throw when config key is missing', async () => {
      findOne.mockResolvedValue(null);

      await expect(
        service.getEnv(AppConfigKey.ARI_CLARISA_API_KEY),
      ).rejects.toThrow(NotFoundException);
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
        json_value: undefined,
        category: undefined,
        subcategory: undefined,
        updated_by: 1,
      });
      expect(result).toMatchObject({
        key: 'k1',
        description: 'new desc',
        simple_value: 'v',
      });
    });
  });
});
