import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ENV } from '../../shared/utils/env.utils';
import { PrmsTocEnvelope, PrmsTocPayload } from './dto/prms-toc.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12 / R-BIL-077
//
// SINGLETON-SCOPED BY DESIGN — see parent design.md §3.4 Constraint A.
// Do NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped
// provider. The HLO/indicator panel hot path goes through this service.
//
// Cache strategy (per design D-PI-12): TTL only, in-memory. The key is the
// `compositeCode` (`<program>-<areaOfWork>`, e.g. `SP02-AOW03`) — same one
// PRMS echoes back in its payload. Project↔ToC changes are rare.
//
// Resilience (per NFR-BIL-073): on upstream error with WARM cache, serve
// the cached payload + log a warn line. On COLD cache, throw
// ServiceUnavailableException so the response envelope is a clean 503
// instead of leaking an upstream stack trace.
//
// Auth: the endpoint lives under `/api/public-results-framework/...` and
// requires no Bearer token in the test environment. If staging/prod ever
// gates it, add the header here — do NOT spread axios calls elsewhere.
@Injectable()
export class PrmsTocService {
  private readonly logger = new Logger(PrmsTocService.name);
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache = new Map<
    string,
    { data: PrmsTocPayload; fetchedAt: number }
  >();

  constructor(private readonly http: HttpService) {}

  /**
   * Fetch the ToC results for a single (program, areaOfWork) pair.
   * Cached for TTL_MS keyed by composite code. Returns the inner `response`
   * payload — callers do not see the upstream envelope wrapper.
   */
  async getTocResults(
    program: string,
    areaOfWork: string,
  ): Promise<PrmsTocPayload> {
    const normalizedProgram = program?.trim();
    const normalizedAow = areaOfWork?.trim();

    if (!normalizedProgram || !normalizedAow) {
      throw new ServiceUnavailableException(
        'PRMS ToC requires both program and areaOfWork',
      );
    }

    const key = this.cacheKey(normalizedProgram, normalizedAow);
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.fetchedAt < this.TTL_MS) {
      return hit.data;
    }

    try {
      const host = this.assertHost();
      const url = `${host.replace(/\/$/, '')}/api/public-results-framework/toc-results`;
      const { data } = await firstValueFrom(
        this.http.get<PrmsTocEnvelope>(url, {
          params: {
            program: normalizedProgram,
            areaOfWork: normalizedAow,
          },
        }),
      );

      const payload = data?.response;
      if (!payload) {
        throw new Error('PRMS ToC returned an empty payload');
      }

      this.cache.set(key, { data: payload, fetchedAt: now });
      this.logger.debug(
        `[PrmsTocService] cache refreshed for ${key} (${
          (payload.tocResultsOutcomes?.length ?? 0) +
          (payload.tocResultsOutputs?.length ?? 0)
        } items)`,
      );
      return payload;
    } catch (err) {
      if (hit) {
        this.logger.warn(
          `[PrmsTocService] upstream error for ${key}; serving stale cache (age=${Math.round(
            (now - hit.fetchedAt) / 1000,
          )}s): ${(err as Error)?.message ?? err}`,
        );
        return hit.data;
      }
      this.logger.error(
        `[PrmsTocService] upstream error for ${key} with cold cache: ${
          (err as Error)?.message ?? err
        }`,
      );
      throw new ServiceUnavailableException('PRMS ToC temporarily unreachable');
    }
  }

  /**
   * Batch helper: fetch multiple pairs in parallel, deduped by composite key.
   * Returns results in the same order as the input pairs. Used by
   * BilateralService when fanning out one PRMS call per (SP, AOW) pair
   * derived from CLARISA's project_mappings_array.
   */
  async getTocResultsForPairs(
    pairs: Array<{ program: string; areaOfWork: string }>,
  ): Promise<PrmsTocPayload[]> {
    if (!pairs?.length) return [];

    return Promise.all(
      pairs.map((p) => this.getTocResults(p.program, p.areaOfWork)),
    );
  }

  /**
   * Test-only seam — lets specs reset cache between cases without
   * waiting 5 minutes. Not part of the public contract; do not call
   * from production code.
   */
  resetCacheForTests(): void {
    this.cache.clear();
  }

  private cacheKey(program: string, areaOfWork: string): string {
    return `${program}-${areaOfWork}`;
  }

  private assertHost(): string {
    const host = ENV.PRMS_TOC_HOST;
    if (!host) {
      throw new ServiceUnavailableException(
        'PRMS ToC integration not configured (ARI_PRMS_TOC_HOST missing)',
      );
    }
    return host;
  }
}
