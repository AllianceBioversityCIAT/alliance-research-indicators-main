import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Clarisa } from '../clarisa.connection';
import { ClarisaProject } from './dto/clarisa-project.types';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.10 / R-BIL-076
//
// SINGLETON-SCOPED BY DESIGN — see parent design.md §3.4 Constraint A.
// Do NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped
// provider. The picker hot path goes through this service; cascading
// REQUEST scope here would re-introduce the empty-shell DI cycle.
//
// Cache strategy (per design D-PI-12): TTL only, in-memory, no event
// invalidation. Project↔SP changes are rare. If staleness becomes a
// problem, add an admin-only POST /refresh later (out of scope for v2).
//
// Resilience (per NFR-BIL-073): on upstream error with WARM cache, serve
// the cached payload + log a warn line. On COLD cache, throw
// ServiceUnavailableException so the response envelope is a clean 503
// instead of leaking an upstream stack trace.
// CLARISA acronym for the Alliance of Bioversity and CIAT. The picker only
// offers Alliance-led bilateral projects; other centers' projects stay
// resolvable by id (findProjectById) so existing mappings keep rendering.
const ALLIANCE_LEAD_ACRONYM = 'ABC';

@Injectable()
export class ClarisaProjectsService {
  private readonly logger = new Logger(ClarisaProjectsService.name);
  private readonly connection: Clarisa;
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache: { data: ClarisaProject[]; fetchedAt: number } | null = null;

  constructor(http: HttpService) {
    this.connection = new Clarisa(http);
  }

  async listBilateralProjects(): Promise<ClarisaProject[]> {
    const all = await this.getCachedAll();
    return all.filter(
      (p) =>
        p.source_of_funding === 'Bilateral' &&
        p.lead_institution_object?.acronym === ALLIANCE_LEAD_ACRONYM,
    );
  }

  async findProjectById(id: number): Promise<ClarisaProject | null> {
    if (!Number.isFinite(id)) return null;
    const all = await this.getCachedAll();
    return all.find((p) => p.id === id) ?? null;
  }

  /**
   * Test-only seam — lets specs reset cache between cases without
   * waiting 5 minutes. Not part of the public contract; do not call
   * from production code.
   */
  resetCacheForTests(): void {
    this.cache = null;
  }

  private async getCachedAll(): Promise<ClarisaProject[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.fetchedAt < this.TTL_MS) {
      return this.cache.data;
    }

    try {
      const data = await this.connection.get<ClarisaProject[]>('api/projects');
      this.cache = { data, fetchedAt: now };
      this.logger.debug(
        `[ClarisaProjectsService] cache refreshed (${data.length} projects)`,
      );
      return data;
    } catch (err) {
      if (this.cache) {
        this.logger.warn(
          `[ClarisaProjectsService] upstream error; serving stale cache (age=${Math.round(
            (now - this.cache.fetchedAt) / 1000,
          )}s): ${(err as Error)?.message ?? err}`,
        );
        return this.cache.data;
      }
      this.logger.error(
        `[ClarisaProjectsService] upstream error with cold cache: ${
          (err as Error)?.message ?? err
        }`,
      );
      throw new ServiceUnavailableException(
        'CLARISA /api/projects temporarily unreachable',
      );
    }
  }
}
