import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Clarisa } from '../clarisa.connection';
import {
  ClarisaAreaOfWork,
  ClarisaCgiarEntity,
} from './dto/clarisa-cgiar-entity.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// SINGLETON-SCOPED BY DESIGN — see parent design.md §3.4 Constraint A.
// Do NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped
// provider. The HLO/indicator panel hot path goes through this service.
//
// Cache strategy (per design D-PI-12, mirroring ClarisaProjectsService): TTL
// only, in-memory, no event invalidation. The SP→AOW hierarchy changes once
// per portfolio cycle.
//
// Resilience (per NFR-BIL-073): on upstream error with WARM cache, serve the
// cached payload + log a warn line. On COLD cache, throw
// ServiceUnavailableException so the response envelope is a clean 503.
@Injectable()
export class ClarisaCgiarEntitiesService {
  private readonly logger = new Logger(ClarisaCgiarEntitiesService.name);
  private readonly connection: Clarisa;
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache: { data: ClarisaCgiarEntity[]; fetchedAt: number } | null =
    null;

  constructor(http: HttpService) {
    this.connection = new Clarisa(http);
  }

  /**
   * Returns, for each requested Science Program code, the list of active Areas
   * of Work that name it as their parent in the CLARISA catalog. SP codes with
   * no AOWs are simply absent from the map.
   */
  async getAreasOfWorkBySp(
    spCodes: string[],
  ): Promise<Map<string, ClarisaAreaOfWork[]>> {
    const wanted = new Set(spCodes.map((c) => c?.trim()).filter(Boolean));
    const out = new Map<string, ClarisaAreaOfWork[]>();
    if (!wanted.size) return out;

    const catalog = await this.getCachedAll();
    for (const e of catalog) {
      if (e.level !== 2) continue;
      if (e.entity_type?.name !== 'Key Area of Work') continue;
      if (!this.isActive(e.is_active)) continue;
      const parentCode = e.parent?.code;
      if (!parentCode || !wanted.has(parentCode)) continue;
      if (!e.code) continue;

      const list = out.get(parentCode) ?? [];
      list.push({
        code: e.code,
        name: (e.name ?? e.code).trim(),
        composite_code: e.compose_code ?? `${parentCode}-${e.code}`,
      });
      out.set(parentCode, list);
    }

    // Stable order: by AOW code so derived pairs + PRMS cache keys are deterministic.
    for (const list of out.values()) {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }
    return out;
  }

  /**
   * Test-only seam — lets specs reset cache between cases without waiting
   * 5 minutes. Not part of the public contract; do not call from prod code.
   */
  resetCacheForTests(): void {
    this.cache = null;
  }

  private isActive(value: number | boolean): boolean {
    return value === true || value === 1;
  }

  private async getCachedAll(): Promise<ClarisaCgiarEntity[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < this.TTL_MS) {
      return this.cache.data;
    }

    try {
      const data = await this.connection.get<ClarisaCgiarEntity[]>(
        'api/cgiar-entities?version=2',
      );
      this.cache = { data, fetchedAt: now };
      this.logger.debug(
        `[ClarisaCgiarEntitiesService] cache refreshed (${data.length} entities)`,
      );
      return data;
    } catch (err) {
      if (this.cache) {
        this.logger.warn(
          `[ClarisaCgiarEntitiesService] upstream error; serving stale cache (age=${Math.round(
            (now - this.cache.fetchedAt) / 1000,
          )}s): ${(err as Error)?.message ?? err}`,
        );
        return this.cache.data;
      }
      this.logger.error(
        `[ClarisaCgiarEntitiesService] upstream error with cold cache: ${
          (err as Error)?.message ?? err
        }`,
      );
      throw new ServiceUnavailableException(
        'CLARISA /api/cgiar-entities temporarily unreachable',
      );
    }
  }
}
