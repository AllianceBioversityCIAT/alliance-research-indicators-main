import { BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DEFAULT_CLARISA_MAPPING_PHASE,
  MappingPhaseResolver,
} from './mapping-phase.resolver';
import { AppConfig } from '../../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';

describe('MappingPhaseResolver', () => {
  let resolver: MappingPhaseResolver;
  let mockRepository: {
    findOne: jest.Mock;
  };
  let mockDataSource: {
    getRepository: jest.Mock;
  };

  const originalEnv = process.env.ARI_CLARISA_PROJECTS_PHASE;

  beforeEach(() => {
    mockRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepository),
    };

    delete process.env.ARI_CLARISA_PROJECTS_PHASE;
    resolver = new MappingPhaseResolver(
      mockDataSource as unknown as DataSource,
    );
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ARI_CLARISA_PROJECTS_PHASE = originalEnv;
    } else {
      delete process.env.ARI_CLARISA_PROJECTS_PHASE;
    }
  });

  describe('Constructor & DI architecture (NFR-BAS-001, R-BAS-007)', () => {
    it('instantiates with DataSource only and does not require AppConfigService or CurrentUserUtil', () => {
      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(MappingPhaseResolver);
    });
  });

  describe('Tier 1: Explicit caller argument (R-BAS-003)', () => {
    it('returns the numeric phase when caller passes a number', async () => {
      const result = await resolver.resolvePhase(2025);
      expect(result).toBe(2025);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns the numeric phase when caller passes a valid numeric string', async () => {
      const result = await resolver.resolvePhase('2025');
      expect(result).toBe(2025);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('returns the numeric phase when caller passes a numeric string with surrounding whitespace', async () => {
      const result = await resolver.resolvePhase('  2027  ');
      expect(result).toBe(2027);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws BadRequestException with the standard message when caller passes a non-numeric string', async () => {
      await expect(resolver.resolvePhase('abc')).rejects.toThrow(
        BadRequestException,
      );
      await expect(resolver.resolvePhase('abc')).rejects.toThrow(
        'Invalid phase "abc": must be a numeric value.',
      );
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when caller passes NaN', async () => {
      await expect(resolver.resolvePhase(NaN)).rejects.toThrow(
        BadRequestException,
      );
      await expect(resolver.resolvePhase(NaN)).rejects.toThrow(
        'Invalid phase "NaN": must be a numeric value.',
      );
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Tier 2: app_config database row (R-BAS-003, R-BAS-007)', () => {
    it('resolves phase from active app_config row with numeric simple_value', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2026',
        is_active: true,
      });

      const result = await resolver.resolvePhase();

      expect(result).toBe(2026);
      expect(mockDataSource.getRepository).toHaveBeenCalledWith(AppConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        },
      });
    });

    it('resolves updated phase when app_config is edited by an administrator', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2027',
        is_active: true,
      });

      const result = await resolver.resolvePhase();
      expect(result).toBe(2027);
    });

    it('falls through to Tier 3/4 when app_config row is not found (null)', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await resolver.resolvePhase();
      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
    });

    it('falls through to Tier 3/4 when app_config row has is_active: false', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2027',
        is_active: false,
      });

      const result = await resolver.resolvePhase();
      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
    });

    it('falls through to Tier 3/4 when app_config simple_value is null or empty whitespace', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '   ',
        is_active: true,
      });

      const result = await resolver.resolvePhase();
      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
    });

    it('logs a warning and falls through to Tier 3/4 without throwing when app_config simple_value is non-numeric', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: 'invalid-stored-phase',
        is_active: true,
      });

      const result = await resolver.resolvePhase();

      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Invalid app_config value "invalid-stored-phase" for key "ARI_CLARISA_PROJECTS_PHASE"',
        ),
      );

      warnSpy.mockRestore();
    });

    it('catches database read errors, logs a warning once, and falls through to Tier 3/4 without throwing', async () => {
      const warnSpy = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => {});

      mockRepository.findOne.mockRejectedValue(
        new Error('Database connection lost'),
      );

      const result = await resolver.resolvePhase();

      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read app_config key'),
      );

      warnSpy.mockRestore();
    });
  });

  describe('Tier 3: ENV.CLARISA_PROJECTS_PHASE (R-BAS-003, S1 carried tests)', () => {
    it('resolves phase from ENV when app_config row is absent', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';

      const result = await resolver.resolvePhase();
      expect(result).toBe(2025);
    });

    it('throws BadRequestException when ARI_CLARISA_PROJECTS_PHASE env var is non-numeric (S1 carry-over)', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      process.env.ARI_CLARISA_PROJECTS_PHASE = 'invalid-phase';

      await expect(resolver.resolvePhase()).rejects.toThrow(
        BadRequestException,
      );
      await expect(resolver.resolvePhase()).rejects.toThrow(
        'Invalid ARI_CLARISA_PROJECTS_PHASE "invalid-phase": must be a numeric value.',
      );
    });
  });

  describe('Tier 4: Default literal 2026 (R-BAS-003)', () => {
    it('returns default literal 2026 when all upstream tiers are absent/empty', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      delete process.env.ARI_CLARISA_PROJECTS_PHASE;

      const result = await resolver.resolvePhase();
      expect(result).toBe(2026);
      expect(result).toBe(DEFAULT_CLARISA_MAPPING_PHASE);
    });
  });

  describe('Precedence order (R-BAS-003)', () => {
    it('Tier 1 (explicit argument) takes precedence over Tier 2 (app_config), Tier 3 (ENV), and Tier 4 (default)', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2027',
        is_active: true,
      });
      process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';

      const result = await resolver.resolvePhase(2028);
      expect(result).toBe(2028);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('Tier 2 (app_config) takes precedence over Tier 3 (ENV) and Tier 4 (default)', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2027',
        is_active: true,
      });
      process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';

      const result = await resolver.resolvePhase();
      expect(result).toBe(2027);
    });

    it('Tier 3 (ENV) takes precedence over Tier 4 (default) when app_config has invalid value', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: 'non-numeric-db-value',
        is_active: true,
      });
      process.env.ARI_CLARISA_PROJECTS_PHASE = '2025';

      const result = await resolver.resolvePhase();
      expect(result).toBe(2025);
    });
  });

  describe('Caching & Cache Isolation (R-BAS-003, R-BAS-007, NFR-BAS-002)', () => {
    it('performs zero further database reads on subsequent ambient calls within TTL', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2026',
        is_active: true,
      });

      const firstResult = await resolver.resolvePhase();
      expect(firstResult).toBe(2026);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

      // Subsequent calls within TTL should use cached value with zero extra DB reads
      const secondResult = await resolver.resolvePhase();
      expect(secondResult).toBe(2026);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

      const thirdResult = await resolver.resolvePhase();
      expect(thirdResult).toBe(2026);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('does not write explicit caller argument to ambient cache and does not pollute subsequent ambient calls', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2026',
        is_active: true,
      });

      // Call 1: Explicit argument 2025
      const explicitResult = await resolver.resolvePhase(2025);
      expect(explicitResult).toBe(2025);
      expect(mockRepository.findOne).not.toHaveBeenCalled();

      // Call 2: Ambient call with no argument must return ambient value (2026), NOT 2025
      const ambientResult = await resolver.resolvePhase();
      expect(ambientResult).toBe(2026);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

      // Call 3: Explicit argument 2024
      const anotherExplicit = await resolver.resolvePhase(2024);
      expect(anotherExplicit).toBe(2024);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

      // Call 4: Ambient call still returns cached ambient value 2026 with zero extra DB reads
      const cachedAmbient = await resolver.resolvePhase();
      expect(cachedAmbient).toBe(2026);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('refreshes ambient cache after TTL (5 minutes) expires', async () => {
      jest.useFakeTimers();
      try {
        mockRepository.findOne.mockResolvedValue({
          key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
          simple_value: '2026',
          is_active: true,
        });

        const r1 = await resolver.resolvePhase();
        expect(r1).toBe(2026);
        expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

        // Advance 4 minutes (within 5-min TTL)
        jest.advanceTimersByTime(4 * 60 * 1000);
        const r2 = await resolver.resolvePhase();
        expect(r2).toBe(2026);
        expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

        // Advance past 5 minutes
        jest.advanceTimersByTime(2 * 60 * 1000);
        mockRepository.findOne.mockResolvedValue({
          key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
          simple_value: '2027',
          is_active: true,
        });

        const r3 = await resolver.resolvePhase();
        expect(r3).toBe(2027);
        expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    });

    it('resetCacheForTests seam clears ambient cache and forces fresh database read', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2026',
        is_active: true,
      });

      await resolver.resolvePhase();
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);

      resolver.resetCacheForTests();

      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2027',
        is_active: true,
      });

      const freshResult = await resolver.resolvePhase();
      expect(freshResult).toBe(2027);
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolve alias method', () => {
    it('delegates to resolvePhase and returns identical results', async () => {
      mockRepository.findOne.mockResolvedValue({
        key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        simple_value: '2026',
        is_active: true,
      });

      const result = await resolver.resolve();
      expect(result).toBe(2026);

      const explicitResult = await resolver.resolve(2025);
      expect(explicitResult).toBe(2025);
    });
  });
});
