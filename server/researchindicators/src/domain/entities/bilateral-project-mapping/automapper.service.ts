import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Brackets, DataSource, Repository } from 'typeorm';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ReportingYearResolver } from '../../shared/utils/reporting-year.resolver';
import { normalizeExternalCode } from './utils/external-code.util';
import { BilateralProjectMapping } from './entities/bilateral-project-mapping.entity';
import { MappingSourceEnum } from './enum/mapping-source.enum';
import { User } from '../../complementary-entities/secondary/user/user.entity';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 / R-CAM-001, NFR-CAM-001
// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-03 / R-CAM-002 (idempotency),
// R-CAM-003, R-CAM-005, NFR-CAM-002, NFR-CAM-004
//
// SINGLETON-SCOPED BY DESIGN — see bilateral-project-mapping.module.ts header
// and parent design.md §12 DD-11 (inherited from clarisa-project-automapping).
// Injects ClarisaProjectsService, DataSource, and ReportingYearResolver.
// ReportingYearResolver is a singleton whose own constructor takes DataSource
// only (global-utils.module.ts); it does not carry Scope.REQUEST.
// Do NOT inject AgressoContractRepository (it carries Scope.REQUEST via
// CurrentUserUtil) and do NOT import AgressoContractModule — cascading
// REQUEST scope through this module re-introduces the DI cycle NFR-BAS-001
// exists to prevent. Read AGRESSO via DataSource.getRepository(), the
// pattern already shipped in bilateral-mapping-coverage.service.ts.
// The bilateral_project_mapping table is read/written the SAME way —
// DataSource.getRepository(BilateralProjectMapping) — so there is still no
// BilateralProjectMappingRepository injection.
//
// Resolution (design.md §5 steps 1-5): eligible cohort -> guard ->
// derive -> group -> confirm in AGRESSO. NO WRITES. `resolved` means
// "unique, exists in AGRESSO, not yet checked against the current-year
// mapping row". Classification (§6.3: toCreate / alreadyMapped / toUpdate /
// divergent / inactive) is the next step and never writes `is_active`.
//
// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-05 /
// R-APM-005, R-APM-009, DD-4, DD-8, DD-10. resolve() reads the reporting
// year once and returns it. classify/apply/coverage carry that value;
// listBilateralProjects still receives it under the option name `phase`.
//
// T-03 DTO TRAP (resolved, see execution.md T-00 FORWARD POINTER): the
// admin-facing CreateBilateralProjectMappingDto requires `confidence_score`
// whenever `source !== MANUAL` (@ValidateIf with no @IsOptional). That
// collides with NFR-CAM-002 (confidence_score MUST stay null). classify()/
// apply() below never construct or pass through that DTO — they write
// BilateralProjectMapping rows directly via the repository, exactly like
// BilateralProjectMappingService.create()'s own transaction does internally,
// keeping the admin-facing HTTP contract completely untouched.

export interface AutomapperCandidate {
  clarisaProjectId: number;
  clarisaProjectFullName: string | null;
  clarisaProjectShortName: string | null;
  externalCode: string | null;
  derivedContractId: string;
}

export interface AutomapperResolution {
  reportingYear: number;
  resolved: AutomapperCandidate[];
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
}

// §6.3 — one current-year row per agreement, any is_active. `toCreate` has
// no existing row. The other buckets carry that row's id so an in-place
// update cannot target the wrong record. `inactive.refreshed` is true only
// when Apply rewrote the CLARISA fields (row 6) and left is_active false.
export interface AutomapperToCreateEntry extends AutomapperCandidate {
  action: 'toCreate';
}

export interface AutomapperReconciledEntry extends AutomapperCandidate {
  action: 'alreadyMapped' | 'divergent' | 'toUpdate';
  existingMappingId: number;
  existingClarisaProjectId: number;
}

export interface AutomapperInactiveEntry extends AutomapperCandidate {
  action: 'inactive';
  existingMappingId: number;
  existingClarisaProjectId: number;
  refreshed: boolean;
}

export interface AutomapperClassification {
  toCreate: AutomapperToCreateEntry[];
  alreadyMapped: AutomapperReconciledEntry[];
  toUpdate: AutomapperReconciledEntry[];
  divergent: AutomapperReconciledEntry[];
  inactive: AutomapperInactiveEntry[];
}

export interface AutomapperApplyResult {
  created: number;
  alreadyMapped: number;
  divergent: number;
  updated: number;
  inactive: number;
}

// §6.4 / R-APM-009. mapped + pending + inactive = reachable. Never a figure
// computed against the AGRESSO contract table.
export interface AutomapperCoverage {
  reporting_year: number;
  mapped: number;
  pending: number;
  inactive: number;
  reachable: number;
}

@Injectable()
export class AutomapperService {
  private readonly logger = new LoggerUtil({ name: AutomapperService.name });

  constructor(
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly dataSource: DataSource,
    private readonly reportingYearResolver: ReportingYearResolver,
  ) {}

  async resolve(): Promise<AutomapperResolution> {
    // DD-10: one read per operation. Callers carry `reportingYear` into
    // classify/apply so a mid-request config flip cannot mix years.
    // The CLARISA option is still named `phase` (T-04 contract).
    const reportingYear = await this.reportingYearResolver.resolve();
    const cohort = await this.clarisaProjectsService.listBilateralProjects({
      phase: reportingYear,
    });

    // Step 2: NFR-CAM-001 guard. Cohort non-empty AND zero projects carry
    // external_code -> abort loudly instead of silently reporting "0 to do".
    const withExternalCode = cohort.filter((p) => this.hasExternalCode(p));
    if (cohort.length > 0 && withExternalCode.length === 0) {
      const message =
        `Automapper aborted (NFR-CAM-001): ${cohort.length} eligible project(s) found, ` +
        'but none carry external_code. This CLARISA feed cannot support automated mapping ' +
        '— check ARI_CLARISA_HOST / environment before re-running.';
      this.logger._warn(message);
      throw new UnprocessableEntityException(message);
    }

    // Step 3: derive the contract id via the ONE shipped normalization
    // (NFR-CAM-003) — no second strip is written here.
    const candidates: AutomapperCandidate[] = cohort.map((p) => ({
      clarisaProjectId: p.id,
      clarisaProjectFullName: p.full_name ?? null,
      clarisaProjectShortName: p.short_name ?? null,
      externalCode: p.external_code ?? null,
      derivedContractId: normalizeExternalCode(p.external_code).normalized,
    }));

    // Step 4: group derived ids. A project with no derivable id (missing/
    // blank external_code) can never collide with another and is reported
    // unresolved directly rather than joining the grouping pass.
    const groups = new Map<string, AutomapperCandidate[]>();
    const unresolvedNoCode: AutomapperCandidate[] = [];

    for (const candidate of candidates) {
      if (!candidate.derivedContractId) {
        unresolvedNoCode.push(candidate);
        continue;
      }
      const group = groups.get(candidate.derivedContractId);
      if (group) {
        group.push(candidate);
      } else {
        groups.set(candidate.derivedContractId, [candidate]);
      }
    }

    const ambiguous: AutomapperCandidate[] = [];
    const uniqueCandidates: AutomapperCandidate[] = [];
    for (const group of groups.values()) {
      if (group.length > 1) {
        // Any id claimed by 2+ projects -> ambiguous; none is auto-applied.
        ambiguous.push(...group);
      } else {
        uniqueCandidates.push(group[0]);
      }
    }

    // Step 5: confirm existence in AGRESSO, keyed on agreement_id, in a
    // single IN-list query — DataSource only, never AgressoContractRepository.
    const resolved: AutomapperCandidate[] = [];
    const unresolved: AutomapperCandidate[] = [...unresolvedNoCode];

    if (uniqueCandidates.length > 0) {
      const ids = uniqueCandidates.map((c) => c.derivedContractId);
      const contracts = await this.dataSource
        .getRepository(AgressoContract)
        .createQueryBuilder('contract')
        .select(['contract.agreement_id'])
        .where('contract.agreement_id IN (:...ids)', { ids })
        .andWhere('contract.is_active = :isActive', { isActive: true })
        .getMany();

      // The DB comparison above is case/whitespace-insensitive
      // (utf8mb4_unicode_520_ci). Normalize this side to match — case and
      // whitespace ONLY, never normalizeExternalCode (that would also strip
      // a leading B-/C- and widen this into the coverage service's tier-2
      // normalized match, which no requirement here asks for).
      const found = new Set(
        contracts
          .map((c) => c.agreement_id?.trim().toUpperCase())
          .filter(Boolean),
      );

      for (const candidate of uniqueCandidates) {
        if (found.has(candidate.derivedContractId)) {
          resolved.push(candidate);
        } else {
          // Absent -> unresolved, recorded WITH the derived id so the gap
          // is diagnosable (R-CAM-001, "BUT it must NOT be silently dropped").
          unresolved.push(candidate);
        }
      }
    }

    this.logger._log(
      `run complete: cohort=${cohort.length}, resolved=${resolved.length}, ambiguous=${ambiguous.length}, unresolved=${unresolved.length}`,
    );

    return { reportingYear, resolved, ambiguous, unresolved };
  }

  /**
   * PREVIEW ONLY, no writes. Classifies each resolved candidate against the
   * current-year row for its agreement (any is_active) per §6.3 rows 1–6.
   * `reportingYear` is the value resolve() already returned (DD-10).
   */
  async classify(
    resolved: AutomapperCandidate[],
    reportingYear: number,
  ): Promise<AutomapperClassification> {
    const repo = this.dataSource.getRepository(BilateralProjectMapping);
    return this.classifyAgainstExisting(repo, resolved, reportingYear);
  }

  /**
   * Performs only what a preview would have classified (design.md §5 step 7).
   * Re-runs step 6 against CURRENT state inside the write transaction rather
   * than trusting a caller-supplied classification: that is what makes apply
   * idempotent (R-CAM-002 "AND IT MUST be idempotent") — a stale preview
   * handed back a second time finds its own prior writes already there and
   * classifies them alreadyMapped, writing nothing. Idempotency lives in
   * step 6, not in a transaction guard (design §5).
   */
  async apply(
    resolved: AutomapperCandidate[],
    user: User,
    reportingYear: number,
  ): Promise<AutomapperApplyResult> {
    const actorUserId = user.sec_user_id;

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BilateralProjectMapping);
      const classification = await this.classifyAgainstExisting(
        repo,
        resolved,
        reportingYear,
      );

      for (const entry of classification.toCreate) {
        const row = repo.create(
          this.newDerivedRow(entry, actorUserId, reportingYear),
        );
        await repo.save(row);
      }

      // Rows 3 and 6: in-place CLARISA refresh by id. Never is_active,
      // deleted_at, or source — activation belongs to the user (R-APM-011).
      const refreshes = [
        ...classification.toUpdate,
        ...classification.inactive.filter((entry) => entry.refreshed),
      ];
      for (const entry of refreshes) {
        this.logger._log(
          `automapper update id=${entry.existingMappingId}: clarisa_project_id ${entry.existingClarisaProjectId} → ${entry.clarisaProjectId}`,
        );
        await repo.update(
          { id: entry.existingMappingId },
          this.clarisaFieldUpdate(entry, actorUserId),
        );
      }

      // alreadyMapped, divergent, and inactive(refreshed: false) write nothing.

      const result: AutomapperApplyResult = {
        created: classification.toCreate.length,
        alreadyMapped: classification.alreadyMapped.length,
        divergent: classification.divergent.length,
        updated: classification.toUpdate.length,
        inactive: classification.inactive.length,
      };

      this.logger._log(
        `apply complete: reporting_year=${reportingYear}, created=${result.created}, ` +
          `updated=${result.updated}, alreadyMapped=${result.alreadyMapped}, ` +
          `inactive=${result.inactive}, divergent=${result.divergent}`,
      );

      return result;
    });
  }

  /**
   * GET .../coverage. `reachable` comes from the same
   * ClarisaProjectsService.listBilateralProjects call resolve() makes.
   * Current-year rows only. Precedence (§6.4): a project is `mapped` if any
   * matched row is active, else `inactive` if any matched row exists, else
   * `pending`. That is what keeps mapped + pending + inactive = reachable.
   * Match is by project id OR normalized external code, as before.
   *
   * NOT BilateralMappingCoverageService.getCoverageReport() — that instrument
   * reports against the contract table. The two coexist.
   *
   * The year is resolved once here (coverage is its own operation, DD-10).
   */
  async coverage(): Promise<AutomapperCoverage> {
    const reportingYear = await this.reportingYearResolver.resolve();
    const cohort = await this.clarisaProjectsService.listBilateralProjects({
      phase: reportingYear,
    });
    const reachable = cohort.length;

    if (reachable === 0) {
      return {
        reporting_year: reportingYear,
        mapped: 0,
        pending: 0,
        inactive: 0,
        reachable: 0,
      };
    }

    const cohortProjectIds = cohort.map((p) => p.id);
    const cohortExternalCodes = cohort
      .map((p) => normalizeExternalCode(p.external_code).normalized)
      .filter(Boolean);

    const qb = this.dataSource
      .getRepository(BilateralProjectMapping)
      .createQueryBuilder('bpm')
      .where(
        new Brackets((innerQb) => {
          innerQb.where('bpm.clarisa_project_id IN (:...ids)', {
            ids: cohortProjectIds,
          });
          if (cohortExternalCodes.length > 0) {
            innerQb.orWhere('bpm.clarisa_external_code IN (:...codes)', {
              codes: cohortExternalCodes,
            });
          }
        }),
      )
      .andWhere('bpm.reporting_year = :reportingYear', { reportingYear });

    const rows = await qb.getMany();

    let mapped = 0;
    let inactive = 0;
    for (const project of cohort) {
      const normCode = normalizeExternalCode(project.external_code).normalized;
      const matches = rows.filter((row) =>
        this.rowMatchesProject(row, project.id, normCode),
      );
      if (matches.some((row) => row.is_active === true)) {
        mapped++;
      } else if (matches.length > 0) {
        inactive++;
      }
    }
    const pending = reachable - mapped - inactive;

    this.logger._log(
      `coverage: reporting_year=${reportingYear}, reachable=${reachable}, mapped=${mapped}, pending=${pending}, inactive=${inactive}`,
    );

    return {
      reporting_year: reportingYear,
      mapped,
      pending,
      inactive,
      reachable,
    };
  }

  /**
   * Shared by classify() (preview, non-transactional repo) and apply()
   * (transactional manager's repo) so step 6 has exactly one implementation.
   */
  private async classifyAgainstExisting(
    repo: Repository<BilateralProjectMapping>,
    resolved: AutomapperCandidate[],
    reportingYear: number,
  ): Promise<AutomapperClassification> {
    const toCreate: AutomapperToCreateEntry[] = [];
    const alreadyMapped: AutomapperReconciledEntry[] = [];
    const toUpdate: AutomapperReconciledEntry[] = [];
    const divergent: AutomapperReconciledEntry[] = [];
    const inactive: AutomapperInactiveEntry[] = [];

    if (resolved.length === 0) {
      return { toCreate, alreadyMapped, toUpdate, divergent, inactive };
    }

    const ids = resolved.map((c) => c.derivedContractId);
    // Current-year rows in ANY state. An is_active filter here is what made
    // an inactive A1697 look absent and get a second row inserted (P-9).
    const existingRows = await repo
      .createQueryBuilder('bpm')
      .where('bpm.agresso_agreement_id IN (:...ids)', { ids })
      .andWhere('bpm.reporting_year = :reportingYear', { reportingYear })
      .getMany();

    // Same case/whitespace symmetry fix as T-02's AGRESSO-side lookup
    // (utf8mb4_unicode_520_ci on this table too — orm.config.ts:60). A
    // MANUAL row is hand-typed and may not already be trim()+toUpperCase()d;
    // comparing it against a normalized derivedContractId without matching
    // normalization here would reproduce the exact K-005/KZ-013 mirror bug
    // T-02 fixed, just on this table instead of AGRESSO's.
    const existingByAgreement = new Map<string, BilateralProjectMapping>();
    for (const row of existingRows) {
      const key = row.agresso_agreement_id?.trim().toUpperCase();
      if (key) existingByAgreement.set(key, row);
    }

    for (const candidate of resolved) {
      const existing = existingByAgreement.get(candidate.derivedContractId);

      if (!existing) {
        toCreate.push({ ...candidate, action: 'toCreate' });
        continue;
      }

      const sameProject =
        existing.clarisa_project_id === candidate.clarisaProjectId;
      const automationOwned = existing.source !== MappingSourceEnum.MANUAL;
      const reconciled = {
        ...candidate,
        existingMappingId: existing.id,
        existingClarisaProjectId: existing.clarisa_project_id,
      };

      if (sameProject && existing.is_active === true) {
        alreadyMapped.push({ ...reconciled, action: 'alreadyMapped' });
        continue;
      }

      if (sameProject) {
        // Row 5 — inactive, same project, any source. No write.
        inactive.push({
          ...reconciled,
          action: 'inactive',
          refreshed: false,
        });
        continue;
      }

      if (!automationOwned) {
        // Row 4 — MANUAL, different project, active or inactive. No write.
        divergent.push({ ...reconciled, action: 'divergent' });
        continue;
      }

      if (existing.is_active === true) {
        toUpdate.push({ ...reconciled, action: 'toUpdate' });
        continue;
      }

      // Row 6 — inactive, different project, automation-owned. Refresh fields.
      inactive.push({ ...reconciled, action: 'inactive', refreshed: true });
    }

    return { toCreate, alreadyMapped, toUpdate, divergent, inactive };
  }

  /**
   * Insert payload for §6.3 row 1. `source` is ALWAYS DERIVED and
   * `confidence_score` is ALWAYS null. `reporting_year` is the carried year
   * (the column is NOT NULL and has no default). `is_active` is true only
   * on this insert — updates never write it.
   *
   * `clarisa_project_short_name` takes clarisaProjectShortName, never the
   * full name (column comment: snapshot of CLARISA short_name).
   */
  private newDerivedRow(
    entry: AutomapperCandidate,
    actorUserId: number,
    reportingYear: number,
  ): Partial<BilateralProjectMapping> {
    return {
      agresso_agreement_id: entry.derivedContractId,
      reporting_year: reportingYear,
      clarisa_project_id: entry.clarisaProjectId,
      clarisa_project_short_name: entry.clarisaProjectShortName ?? null,
      clarisa_external_code: this.normalizedExternalCode(entry),
      source: MappingSourceEnum.DERIVED,
      confidence_score: null,
      notes: null,
      is_active: true,
      created_by: actorUserId,
      updated_by: actorUserId,
    };
  }

  /**
   * In-place CLARISA refresh for §6.3 rows 3 and 6. The omitted fields are
   * the rule: this object must not contain `is_active`, `deleted_at`, or
   * `source`.
   */
  private clarisaFieldUpdate(
    entry: AutomapperCandidate,
    actorUserId: number,
  ): Partial<BilateralProjectMapping> {
    return {
      clarisa_project_id: entry.clarisaProjectId,
      clarisa_project_short_name: entry.clarisaProjectShortName ?? null,
      clarisa_external_code: this.normalizedExternalCode(entry),
      updated_by: actorUserId,
    };
  }

  private normalizedExternalCode(entry: AutomapperCandidate): string | null {
    if (!entry.externalCode) return null;
    return normalizeExternalCode(entry.externalCode).normalized || null;
  }

  private rowMatchesProject(
    row: BilateralProjectMapping,
    projectId: number,
    normCode: string,
  ): boolean {
    if (row.clarisa_project_id === projectId) return true;
    if (!normCode) return false;
    return row.clarisa_external_code?.trim().toUpperCase() === normCode;
  }

  /**
   * design.md §7, K-016 — read-only passthrough to the CLARISA cache's
   * fetch timestamp, for the run report (T-05). Not a resolve()/classify()/
   * apply()/coverage() concern; those methods are unchanged by this getter.
   */
  getFeedFetchedAt(): number | null {
    return this.clarisaProjectsService.getCacheFetchedAt();
  }

  private hasExternalCode(project: ClarisaProject): boolean {
    return (
      project.external_code !== null &&
      project.external_code !== undefined &&
      String(project.external_code).trim() !== ''
    );
  }
}
