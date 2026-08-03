import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ENV } from '../../shared/utils/env.utils';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  TocIntegrationEnvelope,
  TocLevel,
  TocResult,
} from './dto/toc-integration.types';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-01 / R-BIL-090, NFR-BIL-090..092
//
// SINGLETON-SCOPED BY DESIGN — same constraint as prms-toc (D-PI-12).
// Do NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped
// provider. The level-based catalog read hot path goes through this service.
//
// Cache strategy (per design §6.2): TTL only, in-memory, keyed `${sp}:${level}`
// (e.g. `SP01:OUTPUT`). ToC catalog changes are rare.
//
// Resilience (per NFR-BIL-090): on upstream error with WARM cache, serve the
// cached catalog + LoggerUtil warn (sp, level, upstream status). On COLD
// cache, LoggerUtil error then throw ServiceUnavailableException so the
// response envelope is a clean 503 instead of leaking an upstream stack
// trace. An upstream `{"response":[]}` is a VALID empty catalog (HTTP 200):
// cache it and return []. NEVER infer level validity from emptiness — levels
// come only from TocLevelRulesUtil.
//
// Auth: lambda-toc requires no auth headers (verified live 2026-06-09). If
// upstream ever adds auth, add the header here — do NOT spread axios calls
// elsewhere (risk R-1).
@Injectable()
export class TocIntegrationService {
  private readonly logger = new LoggerUtil({
    name: TocIntegrationService.name,
  });
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache = new Map<string, { data: TocResult[]; fetchedAt: number }>();

  constructor(private readonly http: HttpService) {}

  /**
   * Fetch the ToC results catalog for a single (SP, level) pair.
   * Cached for TTL_MS keyed `${sp}:${level}`. Returns the inner `response`
   * array — callers do not see the upstream envelope wrapper.
   */
  async getTocResults(sp: string, level: TocLevel): Promise<TocResult[]> {
    const normalizedSp = sp?.trim();
    const normalizedLevel = level?.trim() as TocLevel;

    if (!normalizedSp || !normalizedLevel) {
      throw new ServiceUnavailableException(
        'ToC integration requires both sp and level',
      );
    }

    const key = this.cacheKey(normalizedSp, normalizedLevel);
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.fetchedAt < this.TTL_MS) {
      return hit.data;
    }

    try {
      const host = this.assertHost();
      const url = `${host.replace(/\/$/, '')}/api/toc-integration/toc/results/category/${normalizedLevel}/initiative/${normalizedSp}`;
      const { data } = await firstValueFrom(
        this.http.get<TocIntegrationEnvelope>(url),
      );

      // `{"response":[]}` is a valid empty catalog — cache it and return [].
      // Only a missing/non-array `response` counts as a malformed payload.
      const payload = data?.response;
      if (!Array.isArray(payload)) {
        throw new Error('lambda-toc returned a malformed payload');
      }

      this.cache.set(key, { data: payload, fetchedAt: now });
      this.logger._debug(
        `cache refreshed for ${key} (${payload.length} ToC results)`,
      );
      return payload;
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (hit) {
        this.logger._warn(
          `upstream error for sp=${normalizedSp} level=${normalizedLevel} status=${
            status ?? 'n/a'
          }; serving stale cache (age=${Math.round(
            (now - hit.fetchedAt) / 1000,
          )}s): ${(err as Error)?.message ?? err}`,
        );
        return hit.data;
      }
      this.logger._error(
        `upstream error for sp=${normalizedSp} level=${normalizedLevel} status=${
          status ?? 'n/a'
        } with cold cache: ${(err as Error)?.message ?? err}`,
      );
      throw new ServiceUnavailableException(
        'ToC integration (lambda-toc) temporarily unreachable',
      );
    }
  }

  /**
   * Batch helper: fetch every (SP, level) combination in parallel — at most
   * sps×levels upstream calls, each going through the cached getTocResults.
   * Returns a Map keyed `${sp}:${level}` (e.g. `SP01:OUTPUT`) → TocResult[],
   * convenient for assembling per-SP-per-level catalogs in the consumer.
   */
  async getTocResultsForSps(
    sps: string[],
    levels: TocLevel[],
  ): Promise<Map<string, TocResult[]>> {
    const out = new Map<string, TocResult[]>();
    if (!sps?.length || !levels?.length) return out;

    const combos = sps.flatMap((sp) => levels.map((level) => ({ sp, level })));
    const results = await Promise.all(
      combos.map((c) => this.getTocResults(c.sp, c.level)),
    );

    combos.forEach((c, i) => {
      out.set(
        this.cacheKey(c.sp.trim(), c.level.trim() as TocLevel),
        results[i],
      );
    });
    return out;
  }

  /**
   * Test-only seam — lets specs reset cache between cases without
   * waiting 5 minutes. Not part of the public contract; do not call
   * from production code.
   */
  resetCacheForTests(): void {
    this.cache.clear();
  }

  private cacheKey(sp: string, level: TocLevel): string {
    return `${sp}:${level}`;
  }

  private assertHost(): string {
    const host = ENV.TOC_INTEGRATION_HOST;
    if (!host) {
      throw new ServiceUnavailableException(
        'ToC integration not configured (ARI_TOC_INTEGRATION_HOST missing)',
      );
    }
    return host;
  }
}
