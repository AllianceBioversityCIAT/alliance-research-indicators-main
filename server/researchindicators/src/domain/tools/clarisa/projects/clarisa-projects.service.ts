import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Clarisa } from '../clarisa.connection';
import { ClarisaProject } from './dto/clarisa-project.types';
import {
  ALLIANCE_CENTRE_SET,
  isAllianceProject,
  isBilateralFunding,
  matchesPhase,
  normalizeToken,
} from './utils/project-selector.util';
import { isAcceptedSpStatus } from '../../../entities/bilateral/utils/sp-mapping.predicate';
import { normalizeExternalCode } from '../../../entities/bilateral-project-mapping/utils/external-code.util';
import { ENV } from '../../../shared/utils/env.utils';
import { ReportingYearResolver } from '../../../shared/utils/reporting-year.resolver';

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
  /** Carried reporting year (DD-10). Omitted → ReportingYearResolver. */
  phase?: number | string;
  onlyWithSciencePrograms?: boolean;
}

/** Cohort load for list() and the bilateral export (R-MFE-011, DD-3). */
export interface BilateralCohort {
  projects: ClarisaProject[];
  available: boolean;
}

@Injectable()
export class ClarisaProjectsService {
  private readonly logger = new Logger(ClarisaProjectsService.name);
  private readonly connection: Clarisa;
  private readonly TTL_MS = 5 * 60 * 1000;

  private cache: {
    data: ClarisaProject[];
    fetchedAt: number;
    phase: number;
  } | null = null;

  constructor(
    http: HttpService,
    private readonly reportingYearResolver: ReportingYearResolver,
  ) {
    this.connection = new Clarisa(http);
  }

  /**
   * Checks whether a project carries at least one accepted Science Program mapping (R-BAS-004, R-PSP-003).
   * Computed once here and used by both the opt-in filter and the controller DTO mapping.
   * No entity-type narrowing (closes D-PSP-8 / OQ-2): CLARISA files SP01–SP08 under
   * code 22, SP09 under 23 (Scaling programs) and SP10–SP13 under 24 (Accelerators),
   * so an SP is recognised by its `SPxx` smo_code — the same rule the per-result
   * picker applies — which also keeps AOW rows (code 26, `AOWxx`) out.
   */
  hasSciencePrograms(project: ClarisaProject): boolean {
    const acceptedStatuses = ENV.BILATERAL_ACCEPTED_SP_STATUSES;
    return (
      project.project_mappings_array?.some(
        (m) =>
          isAcceptedSpStatus(m.status, acceptedStatuses) &&
          /^SP\d/i.test(m.global_unit_object?.smo_code?.trim() ?? ''),
      ) ?? false
    );
  }

  /**
   * Science Programs the picker shows for one project (R-MFE-004, DD-7).
   * The precomputed flag wins, matching the picker. Each mapping is accepted
   * through `hasSciencePrograms`, which reads `ENV.BILATERAL_ACCEPTED_SP_STATUSES`.
   */
  scienceProgramsFor(project: ClarisaProject): {
    code: string | undefined;
    name: string | undefined;
    portfolio: string | undefined;
    allocation: number | undefined;
  }[] {
    const flagged = (project as { has_science_programs?: boolean })
      .has_science_programs;
    const included = flagged ?? this.hasSciencePrograms(project);
    if (!included) {
      return [];
    }

    return (project.project_mappings_array ?? [])
      .filter((mapping) =>
        this.hasSciencePrograms({
          project_mappings_array: [mapping],
        } as ClarisaProject),
      )
      .map((mapping) => ({
        code: mapping.global_unit_object?.smo_code,
        name: mapping.global_unit_object?.name,
        portfolio: mapping.global_unit_object?.portfolio_object?.acronym,
        allocation: mapping.allocation,
      }));
  }

  async listBilateralProjects(
    options?: ListBilateralProjectsOptions,
    limitMs?: number,
  ): Promise<ClarisaProject[]> {
    const targetPhase = await this.resolveListingYear(options?.phase);
    const all = await this.getCachedAll(targetPhase, limitMs);

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

  // @akili-spec docs/specs/bilateral/mapping-filtered-export — T-02 / R-MFE-011, DD-3, DD-12
  //
  // The one cohort load for list() and the export. Every failure, including a
  // malformed (non-array) feed, reports `available: false`. `limitMs` races
  // only the CLARISA request; list() passes none. No call deduplication.
  async loadBilateralCohort(
    phase: number | string,
    limitMs?: number,
  ): Promise<BilateralCohort> {
    try {
      const projects = await this.listBilateralProjects({ phase }, limitMs);
      return { projects, available: true };
    } catch {
      return { projects: [], available: false };
    }
  }

  /**
   * Carried year wins (DD-10). Otherwise the reporting-year resolver.
   * A non-numeric carried year is the same 400 the old resolver raised.
   */
  private async resolveListingYear(carried?: number | string): Promise<number> {
    if (
      carried !== undefined &&
      carried !== null &&
      String(carried).trim() !== ''
    ) {
      const parsed = Number(carried);
      if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
        throw new BadRequestException(
          `Invalid phase "${carried}": must be a numeric value.`,
        );
      }
      return parsed;
    }
    return this.reportingYearResolver.resolve();
  }

  async findProjectById(id: number): Promise<ClarisaProject | null> {
    if (!Number.isFinite(id)) return null;
    const year = await this.reportingYearResolver.resolve();
    const all = await this.getCachedAll(year);
    return all.find((p) => p.id === id) ?? null;
  }

  // @sdd-spec docs/specs/bugfix/pool-funding-sp-picker-empty — T-06 / R-PSP-005 (D-PSP-6)
  async findProjectByExternalCode(
    externalCode: string | null | undefined,
  ): Promise<ClarisaProject | null> {
    const { normalized } = normalizeExternalCode(externalCode);
    if (!normalized) return null;
    const year = await this.reportingYearResolver.resolve();
    const all = await this.getCachedAll(year);
    return (
      all.find(
        (p) => normalizeExternalCode(p.external_code).normalized === normalized,
      ) ?? null
    );
  }

  // @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-02 / R-CPA-002
  async listProjectsForCoverage(): Promise<{
    all: ClarisaProject[];
    slice: ClarisaProject[];
    phaseUsed: number;
  }> {
    const targetPhase = await this.resolveListingYear();
    const all = await this.getCachedAll(targetPhase);

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

  /**
   * Races only the CLARISA request. A timeout rejects into `getCachedAll`'s
   * catch, so a same-phase stale feed is served and any other cache is not.
   * The abandoned request is left to settle and is not deduplicated.
   */
  private async fetchClarisaProjects(
    path: string,
    limitMs?: number,
  ): Promise<ClarisaProject[]> {
    const request = this.connection.get<ClarisaProject[]>(path);
    if (limitMs == null) {
      return request;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('CLARISA cohort load timed out'));
      }, limitMs);
    });

    // A late rejection of the abandoned request must not surface unhandled.
    // Promise.race still observes `request` itself.
    void request.catch(() => undefined);

    try {
      return await Promise.race([request, timeout]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async getCachedAll(
    phase: number,
    limitMs?: number,
  ): Promise<ClarisaProject[]> {
    const now = Date.now();
    if (
      this.cache?.phase === phase &&
      now - this.cache.fetchedAt < this.TTL_MS
    ) {
      return this.cache.data;
    }

    try {
      // `phase` is the year the caller already resolved: the carried year
      // for a listing, otherwise the reporting-year resolver. It is always
      // sent. The cache records that phase: a different phase is a miss, so
      // a year change cannot be served from another year's feed. On upstream
      // error a cached feed is served only when its phase matches; a
      // mismatch falls through to the cold-cache 503 below. A `limitMs`
      // timeout is the same kind of error: same-phase stale feed, or 503.
      const path = `api/projects?phase=${encodeURIComponent(String(phase))}`;
      const data = await this.fetchClarisaProjects(path, limitMs);
      this.cache = { data, fetchedAt: now, phase };

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
      if (this.cache?.phase === phase) {
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
