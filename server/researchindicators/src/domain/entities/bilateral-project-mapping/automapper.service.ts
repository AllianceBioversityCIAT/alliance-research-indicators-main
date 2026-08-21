import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Brackets, DataSource, Repository } from 'typeorm';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { LoggerUtil } from '../../shared/utils/logger.util';
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
// Injects ClarisaProjectsService and DataSource ONLY.
// Do NOT inject AgressoContractRepository (it carries Scope.REQUEST via
// CurrentUserUtil) and do NOT import AgressoContractModule — cascading
// REQUEST scope through this module re-introduces the DI cycle NFR-BAS-001
// exists to prevent. Read AGRESSO via DataSource.getRepository(), the
// pattern already shipped in bilateral-mapping-coverage.service.ts.
// The bilateral_project_mapping table (T-03's own concern) is read/written
// the SAME way — DataSource.getRepository(BilateralProjectMapping) — so the
// DI shape stays exactly ClarisaProjectsService + DataSource; no new
// constructor dependency, no BilateralProjectMappingRepository injection.
//
// Resolution only (design.md §5 steps 1-5): eligible cohort -> guard ->
// derive -> group -> confirm in AGRESSO. NO WRITES. Classification against
// existing mapping rows (step 6: alreadyMapped / divergent / supersede) and
// apply are T-03's scope — this service's `resolved` bucket means "unique,
// exists in AGRESSO, not yet checked against existing mapping rows (the
// bilateral_project_mapping table) — step 6 is T-03's".
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
  resolved: AutomapperCandidate[];
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
}

// design.md §5 step 6 — classification of a `resolved` candidate against the
// existing bilateral_project_mapping row (if any) for its derived contract.
// `toCreate` needs nothing beyond the candidate; the other three buckets
// exist because of an active row, so they carry it — typed separately so a
// missing `existingMappingId` is a compile error, not a runtime possibility
// (T-05's supersede/deactivate write depends on it being present).
export interface AutomapperToCreateEntry extends AutomapperCandidate {
  action: 'toCreate';
}

export interface AutomapperReconciledEntry extends AutomapperCandidate {
  action: 'alreadyMapped' | 'divergent' | 'supersede';
  existingMappingId: number;
  existingClarisaProjectId: number;
}

export interface AutomapperClassification {
  toCreate: AutomapperToCreateEntry[];
  alreadyMapped: AutomapperReconciledEntry[];
  divergent: AutomapperReconciledEntry[];
  supersede: AutomapperReconciledEntry[];
}

export interface AutomapperApplyResult {
  created: number;
  alreadyMapped: number;
  divergent: number;
  superseded: number;
}

// design.md §4 GET .../coverage, R-CAM-004. `reachable` is the eligible-
// project count (the shipped predicates, same call resolve() makes);
// `mapped` + `pending` partition it exactly — never a fourth figure, and
// never a figure computed against the AGRESSO contract table (DD-6, the
// requirement's own `BUT it must NOT`).
export interface AutomapperCoverage {
  mapped: number;
  pending: number;
  reachable: number;
}

@Injectable()
export class AutomapperService {
  private readonly logger = new LoggerUtil({ name: AutomapperService.name });

  constructor(
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly dataSource: DataSource,
  ) {}

  async resolve(phase?: number | string): Promise<AutomapperResolution> {
    // Step 1: the eligible cohort, via ClarisaProjectsService's shipped
    // selection predicates (see project-selector.util.ts). No re-derivation
    // of eligibility happens here — NFR-CAM-003's sibling rule.
    const cohort = await this.clarisaProjectsService.listBilateralProjects({
      phase,
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

    return { resolved, ambiguous, unresolved };
  }

  /**
   * design.md §5 step 6 — PREVIEW ONLY, no writes. Consults the existing
   * active bilateral_project_mapping row (if any) for each resolved
   * candidate's derived contract id and classifies it per the table:
   * none -> toCreate; active/same project -> alreadyMapped; active MANUAL/
   * different project -> divergent (R-CAM-003, never touched); active
   * non-MANUAL/different project -> supersede (R-CAM-005).
   */
  async classify(
    resolved: AutomapperCandidate[],
  ): Promise<AutomapperClassification> {
    const repo = this.dataSource.getRepository(BilateralProjectMapping);
    return this.classifyAgainstExisting(repo, resolved);
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
  ): Promise<AutomapperApplyResult> {
    const actorUserId = user.sec_user_id;

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BilateralProjectMapping);
      const classification = await this.classifyAgainstExisting(repo, resolved);

      for (const entry of classification.toCreate) {
        const row = repo.create(this.newDerivedRow(entry, actorUserId));
        await repo.save(row);
      }

      for (const entry of classification.supersede) {
        // Deactivate the superseded row by id ONLY — never re-point its
        // agresso_agreement_id or clarisa_project_id (R-CAM-005 AC.2). The
        // edit dialog already tells users the contract is immutable after
        // creation; automation inherits that rule.
        await repo.update(
          { id: entry.existingMappingId },
          {
            is_active: false,
            deleted_at: new Date(),
            updated_by: actorUserId,
          },
        );

        // Supersession is deactivate + CREATE — two rows, never one row
        // mutated in place.
        const row = repo.create(this.newDerivedRow(entry, actorUserId));
        await repo.save(row);
      }

      // alreadyMapped and divergent are report-only buckets — no write for
      // either. A divergent MANUAL row is left byte-identical (R-CAM-003).

      const result: AutomapperApplyResult = {
        created: classification.toCreate.length,
        alreadyMapped: classification.alreadyMapped.length,
        divergent: classification.divergent.length,
        superseded: classification.supersede.length,
      };

      this.logger._log(
        `apply complete: created=${result.created}, alreadyMapped=${result.alreadyMapped}, ` +
          `divergent=${result.divergent}, superseded=${result.superseded}`,
      );

      return result;
    });
  }

  /**
   * design.md §4 GET .../coverage, R-CAM-004. Returns the dashboard's three
   * figures — mapped, pending, reachable — never a fourth (DD-6).
   *
   * `reachable` MUST come from the exact same call resolve() makes
   * (ClarisaProjectsService.listBilateralProjects) — this is R-CAM-004 AC.1
   * and NFR-CAM-003's sibling rule: no local reimplementation of "which
   * projects count" (K-005, KZ-013).
   *
   * `mapped` is a direct project-id lookup against bilateral_project_mapping
   * — NOT resolve()/classify()'s derived-AGRESSO-contract-id round trip.
   * Those answer "does this project's derived contract id already have an
   * active mapping row"; coverage answers the simpler question the
   * requirement actually asks — "is this eligible project already mapped" —
   * which is R-CAM-004's own framing ("of which 4 are mapped").
   *
   * `pending` is ALWAYS `reachable - mapped`. It is never queried or derived
   * from any contract-table count (R-CAM-004's `BUT it must NOT`; D-4) — the
   * 1377 unpaired BLR contracts are not pending work and never enter this
   * method at all.
   *
   * NOT BilateralMappingCoverageService.getCoverageReport() — that is S1's
   * contract-first measurement instrument in this same folder, and it reports
   * against the contract table, the denominator R-CAM-004 explicitly forbids.
   * The two coexist; do not extend or call one from the other.
   */
  async coverage(phase?: number | string): Promise<AutomapperCoverage> {
    const cohort = await this.clarisaProjectsService.listBilateralProjects({
      phase,
    });
    const reachable = cohort.length;

    // Zero-cohort case: nothing to query, nothing to divide.
    if (reachable === 0) {
      return { mapped: 0, pending: 0, reachable: 0 };
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
      .andWhere('bpm.is_active = :isActive', { isActive: true });

    const mappedRows = await qb.getMany();

    const mappedProjectIds = new Set(
      mappedRows.map((r) => r.clarisa_project_id),
    );
    const mappedExternalCodes = new Set(
      mappedRows
        .map((r) => r.clarisa_external_code?.trim().toUpperCase())
        .filter(Boolean),
    );

    let mapped = 0;
    for (const p of cohort) {
      const normCode = normalizeExternalCode(p.external_code).normalized;
      if (
        mappedProjectIds.has(p.id) ||
        (normCode && mappedExternalCodes.has(normCode))
      ) {
        mapped++;
      }
    }
    const pending = reachable - mapped;

    this.logger._log(
      `coverage: reachable=${reachable}, mapped=${mapped}, pending=${pending}`,
    );

    return { mapped, pending, reachable };
  }

  /**
   * Shared by classify() (preview, non-transactional repo) and apply()
   * (transactional manager's repo) so step 6 has exactly one implementation.
   */
  private async classifyAgainstExisting(
    repo: Repository<BilateralProjectMapping>,
    resolved: AutomapperCandidate[],
  ): Promise<AutomapperClassification> {
    const toCreate: AutomapperToCreateEntry[] = [];
    const alreadyMapped: AutomapperReconciledEntry[] = [];
    const divergent: AutomapperReconciledEntry[] = [];
    const supersede: AutomapperReconciledEntry[] = [];

    if (resolved.length === 0) {
      return { toCreate, alreadyMapped, divergent, supersede };
    }

    const ids = resolved.map((c) => c.derivedContractId);
    const existingRows = await repo
      .createQueryBuilder('bpm')
      .where('bpm.agresso_agreement_id IN (:...ids)', { ids })
      .andWhere('bpm.is_active = :isActive', { isActive: true })
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

      if (existing.clarisa_project_id === candidate.clarisaProjectId) {
        alreadyMapped.push({
          ...candidate,
          action: 'alreadyMapped',
          existingMappingId: existing.id,
          existingClarisaProjectId: existing.clarisa_project_id,
        });
        continue;
      }

      // Existing active row points at a DIFFERENT project than the matcher
      // just derived.
      if (existing.source === MappingSourceEnum.MANUAL) {
        // MANUAL is immutable to automation — not "usually", never. Report
        // it; a silent skip and a clean agreement are indistinguishable in
        // the output (R-CAM-003 "AND IT MUST").
        divergent.push({
          ...candidate,
          action: 'divergent',
          existingMappingId: existing.id,
          existingClarisaProjectId: existing.clarisa_project_id,
        });
      } else {
        // Phases supersede: deactivate + create, never re-point (R-CAM-005).
        supersede.push({
          ...candidate,
          action: 'supersede',
          existingMappingId: existing.id,
          existingClarisaProjectId: existing.clarisa_project_id,
        });
      }
    }

    return { toCreate, alreadyMapped, divergent, supersede };
  }

  /**
   * The row payload for a row the matcher creates — whether via toCreate or
   * as the new active row of a supersede. `source` is ALWAYS T-00's DERIVED
   * value (NFR-CAM-004 — never AI_SUGGESTED/AI_AUTO) and `confidence_score`
   * is ALWAYS null (NFR-CAM-002 — a constant 1.0 is worse than empty, DD-7).
   * Written directly against the entity shape — deliberately NOT through
   * CreateBilateralProjectMappingDto, whose @ValidateIf(source !== MANUAL)
   * requires confidence_score and would fight this null (see file header).
   *
   * `clarisa_project_short_name`'s own column comment is "Snapshot of
   * CLARISA short_name at mapping time (D-PI-11)" — it takes
   * clarisaProjectShortName, never clarisaProjectFullName. Writing the full
   * name here would leave the table showing a silent mix of short and full
   * names across MANUAL vs matcher-created rows.
   */
  private newDerivedRow(
    entry: AutomapperCandidate,
    actorUserId: number,
  ): Partial<BilateralProjectMapping> {
    return {
      agresso_agreement_id: entry.derivedContractId,
      clarisa_project_id: entry.clarisaProjectId,
      clarisa_project_short_name: entry.clarisaProjectShortName ?? null,
      clarisa_external_code: entry.externalCode
        ? normalizeExternalCode(entry.externalCode).normalized || null
        : null,
      source: MappingSourceEnum.DERIVED,
      confidence_score: null,
      notes: null,
      is_active: true,
      created_by: actorUserId,
      updated_by: actorUserId,
    };
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
