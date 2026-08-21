import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../entities/app-config/entities/app-config.entity';
import { AppConfigKey } from '../../../entities/app-config/enum/app-config-key.enum';
import { ENV } from '../../../shared/utils/env.utils';

export const DEFAULT_CLARISA_MAPPING_PHASE = 2026;

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-02 / R-BAS-003, R-BAS-007, NFR-BAS-001, NFR-BAS-002
//
// SINGLETON-SCOPED BY DESIGN.
// Constructor takes DataSource and NOTHING ELSE.
// Do NOT inject AppConfigService, CurrentUserUtil, or any other REQUEST-scoped
// provider. AppConfigService carries CurrentUserUtil (Scope.REQUEST); injecting
// it would cascade REQUEST scope into the picker's hot path.
//
// Resolution order (first hit wins):
// 1. Explicit caller argument (`?phase=`) -> invalid value throws BadRequestException
// 2. `app_config` row `ARI_CLARISA_PROJECTS_PHASE` -> invalid value logs warn and falls through
// 3. `ENV.CLARISA_PROJECTS_PHASE` -> invalid value throws BadRequestException
// 4. Literal default 2026
//
// Caching rule:
// ONLY the ambient resolution (tiers 2-4) is cached with a 5-minute TTL.
// An explicit tier-1 argument is resolved per call and NEVER written to nor served from cache.
@Injectable()
export class MappingPhaseResolver {
  private readonly logger = new Logger(MappingPhaseResolver.name);
  private readonly TTL_MS = 5 * 60 * 1000;

  private ambientCache: { value: number; fetchedAt: number } | null = null;

  constructor(private readonly dataSource: DataSource) {}

  async resolvePhase(phase?: number | string): Promise<number> {
    // Tier 1: Explicit argument passed by caller
    if (phase !== undefined && phase !== null && String(phase).trim() !== '') {
      const parsed = Number(phase);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        throw new BadRequestException(
          `Invalid phase "${phase}": must be a numeric value.`,
        );
      }
      return parsed;
    }

    // Tiers 2-4: Ambient resolution with 5-minute TTL cache
    const now = Date.now();
    if (this.ambientCache && now - this.ambientCache.fetchedAt < this.TTL_MS) {
      return this.ambientCache.value;
    }

    const ambientValue = await this.resolveAmbientPhase();
    this.ambientCache = { value: ambientValue, fetchedAt: now };
    return ambientValue;
  }

  async resolve(phase?: number | string): Promise<number> {
    return this.resolvePhase(phase);
  }

  /**
   * Test-only seam — lets specs reset cache between cases without
   * waiting 5 minutes. Not part of the public contract; do not call
   * from production code.
   */
  resetCacheForTests(): void {
    this.ambientCache = null;
  }

  private async resolveAmbientPhase(): Promise<number> {
    // Tier 2: app_config database row
    try {
      const repo = this.dataSource.getRepository(AppConfig);
      const appConfig = await repo.findOne({
        where: {
          key: AppConfigKey.ARI_CLARISA_PROJECTS_PHASE,
        },
      });

      if (
        appConfig &&
        appConfig.is_active !== false &&
        appConfig.simple_value !== null &&
        appConfig.simple_value !== undefined
      ) {
        const raw = appConfig.simple_value.trim();
        if (raw !== '') {
          const parsed = Number(raw);
          if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
            return parsed;
          }
          this.logger.warn(
            `[MappingPhaseResolver] Invalid app_config value "${appConfig.simple_value}" for key "${AppConfigKey.ARI_CLARISA_PROJECTS_PHASE}": must be a numeric value. Falling through to ENV / default.`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `[MappingPhaseResolver] Failed to read app_config key "${AppConfigKey.ARI_CLARISA_PROJECTS_PHASE}": ${
          (error as Error)?.message ?? error
        }. Falling through to ENV / default.`,
      );
    }

    // Tier 3: ENV.CLARISA_PROJECTS_PHASE
    const envPhase = ENV.CLARISA_PROJECTS_PHASE;
    if (envPhase !== undefined && envPhase !== null && envPhase !== '') {
      const parsed = Number(envPhase);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        throw new BadRequestException(
          `Invalid ARI_CLARISA_PROJECTS_PHASE "${envPhase}": must be a numeric value.`,
        );
      }
      return parsed;
    }

    // Tier 4: Default literal 2026
    return DEFAULT_CLARISA_MAPPING_PHASE;
  }
}
