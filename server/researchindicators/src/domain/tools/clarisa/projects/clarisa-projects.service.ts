import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Clarisa } from '../clarisa.connection';
import { ClarisaProject } from './dto/clarisa-project.types';
import { ClarisaProjectPhasesResponse } from './dto/clarisa-project-phase.types';
import { MappingPhaseResolver } from './mapping-phase.resolver';
import {
  ALLIANCE_CENTRE_SET,
  isAllianceProject,
  isBilateralFunding,
  matchesPhase,
  normalizeToken,
} from './utils/project-selector.util';
import { isAcceptedSpStatus } from '../../../entities/bilateral/utils/sp-mapping.predicate';
import { ENV } from '../../../shared/utils/env.utils';

// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-03 / R-BAS-001, R-BAS-002, R-BAS-003, R-BAS-004, R-BAS-005, R-BAS-006, NFR-BAS-001
//
// SINGLETON-SCOPED BY DESIGN — see parent design.md §3.4 Constraint A.
// Do NOT inject CurrentUserUtil, ResultsUtil, AppConfigService, or any other
// REQUEST-scoped provider. The picker hot path goes through this service; cascading
// REQUEST scope here would re-introduce the empty-shell DI cycle (NFR-BAS-001).
//
// Cache strategy (per design D-PI-12): TTL only, in-memory, no event
// invalidation. Project↔SP changes are rare. If staleness becomes a
// problem, add an admin-only POST /refresh later (out of scope for v2).
//
// Resilience (per NFR-BIL-073): on upstream error with WARM cache, serve
// the cached payload + log a warn line. On COLD cache, throw
// ServiceUnavailableException so the response envelope is a clean 503
// instead of leaking an upstream stack trace.

export interface ListBilateralProjectsOptions {
  phase?: number | string;
  onlyWithSciencePrograms?: boolean;
}

@Injectable()
export class ClarisaProjectsService {
  private readonly logger = new Logger(ClarisaProjectsService.name);
  private readonly connection: Clarisa;
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache: { data: ClarisaProject[]; fetchedAt: number } | null = null;

  constructor(
    http: HttpService,
    private readonly phaseResolver: MappingPhaseResolver,
  ) {
    this.connection = new Clarisa(http);
  }

  /**
   * Checks whether a project carries at least one accepted Science Program mapping (R-BAS-004, R-PSP-003).
   * Computed once here and used by both the opt-in filter and the controller DTO mapping.
   * Preserves code === 22 narrowing per D-PSP-8.
   */
  hasSciencePrograms(project: ClarisaProject): boolean {
    const acceptedStatuses = ENV.BILATERAL_ACCEPTED_SP_STATUSES;
    return (
      project.project_mappings_array?.some(
        (m) =>
          isAcceptedSpStatus(m.status, acceptedStatuses) &&
          m.global_unit_object?.cgiar_entity_type_object?.code === 22,
      ) ?? false
    );
  }

  async listBilateralProjects(
    options?: ListBilateralProjectsOptions,
  ): Promise<ClarisaProject[]> {
    const targetPhase = await this.phaseResolver.resolvePhase(options?.phase);
    const all = await this.getCachedAll();

    const eligible = all.filter(
      (p) =>
        isBilateralFunding(p.source_of_funding) &&
        isAllianceProject(p) &&
        matchesPhase(p.phase, targetPhase),
    );

    if (eligible.length === 0) {
      const host = process.env.ARI_CLARISA_HOST || 'unknown host';
      this.logger.warn(
        `[ClarisaProjectsService] Zero eligible bilateral projects found from CLARISA host "${host}" (targetPhase=${targetPhase})`,
      );
    }

    const withFlag = eligible.map((p) => ({
      ...p,
      has_science_programs: this.hasSciencePrograms(p),
    }));

    if (options?.onlyWithSciencePrograms) {
      return withFlag.filter((p) => p.has_science_programs);
    }

    return withFlag;
  }

  // @akili-spec docs/specs/bilateral/clarisa-phase-config-variable — T-02 / R-CPC-003, NFR-CPC-002, DD-2, DD-5
  //
  // Returns the distinct phases present in the ELIGIBLE cohort (bilateral +
  // Alliance), each with a project count, plus a separate count of projects
  // whose phase is absent — so an admin never sees a year with zero
  // eligible projects (design.md §6.1 / DD-2).
  //
  // Deliberately applies isBilateralFunding + isAllianceProject only — NOT
  // matchesPhase. Enumerating phases from a phase-filtered cohort
  // (e.g. listBilateralProjects()) would be circular: it would only ever
  // surface the phase already selected. Reads getCachedAll() directly so
  // no additional CLARISA call is made (NFR-CPC-002).
  async getEligiblePhases(): Promise<ClarisaProjectPhasesResponse> {
    const all = await this.getCachedAll();
    const eligible = all.filter(
      (p) => isBilateralFunding(p.source_of_funding) && isAllianceProject(p),
    );

    const counts = new Map<number, number>();
    let phaseAbsentCount = 0;

    for (const p of eligible) {
      const phase = p.phase;
      const isBlank =
        phase === null ||
        phase === undefined ||
        (typeof phase === 'string' && phase.trim() === '');
      if (isBlank) {
        phaseAbsentCount++;
        continue;
      }

      const numericPhase = Number(phase);
      if (Number.isNaN(numericPhase)) {
        phaseAbsentCount++;
        continue;
      }

      counts.set(numericPhase, (counts.get(numericPhase) ?? 0) + 1);
    }

    const phases = Array.from(counts.entries())
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.phase - a.phase);

    return { phases, phaseAbsentCount };
  }

  async findProjectById(id: number): Promise<ClarisaProject | null> {
    if (!Number.isFinite(id)) return null;
    const all = await this.getCachedAll();
    return all.find((p) => p.id === id) ?? null;
  }

  // @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-02 / R-CPA-002
  async listProjectsForCoverage(phase?: number | string): Promise<{
    all: ClarisaProject[];
    slice: ClarisaProject[];
    phaseUsed: number;
  }> {
    const targetPhase = await this.phaseResolver.resolvePhase(phase);
    const all = await this.getCachedAll();

    const slice = all.filter((p) => {
      if (
        !p.source_center_acronym ||
        p.phase === undefined ||
        p.phase === null
      ) {
        return false;
      }
      const normalizedCenter = p.source_center_acronym.trim().toUpperCase();
      const numericPhase = Number(p.phase);
      return (
        ALLIANCE_CENTRE_SET.has(normalizedCenter) &&
        !Number.isNaN(numericPhase) &&
        numericPhase === targetPhase
      );
    });

    return { all, slice, phaseUsed: targetPhase };
  }

  // @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 / §7, K-016
  //
  // Read-only accessor for the current cache's fetch timestamp (ms epoch),
  // or null on a cold cache. Consumed by AutomapperService's run report so
  // an admin can tell whether a run read a fresh CLARISA cohort or one up
  // to 5 minutes stale (the TTL above) — a run immediately after a feed
  // change can still read the cached cohort. Purely additive: does not
  // touch getCachedAll()'s cache/refresh/staleness logic.
  getCacheFetchedAt(): number | null {
    return this.cache?.fetchedAt ?? null;
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

      let sourceCenterCount = 0;
      let legacyLeadCount = 0;
      for (const p of data) {
        if (normalizeToken(p.source_center_acronym) !== '') {
          sourceCenterCount++;
        } else {
          legacyLeadCount++;
        }
      }
      this.logger.debug(
        `[ClarisaProjectsService] cache refreshed (${data.length} projects: ${sourceCenterCount} via source_center_acronym, ${legacyLeadCount} via legacy lead acronym)`,
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
