import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { normalizeExternalCode } from './utils/external-code.util';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-02 / R-CAM-001, NFR-CAM-001
//
// SINGLETON-SCOPED BY DESIGN — see bilateral-project-mapping.module.ts header
// and parent design.md §12 DD-11 (inherited from clarisa-project-automapping).
// Injects ClarisaProjectsService and DataSource ONLY.
// Do NOT inject AgressoContractRepository (it carries Scope.REQUEST via
// CurrentUserUtil) and do NOT import AgressoContractModule — cascading
// REQUEST scope through this module re-introduces the DI cycle NFR-BAS-001
// exists to prevent. Read AGRESSO via DataSource.getRepository(), the
// pattern already shipped in bilateral-mapping-coverage.service.ts.
//
// Resolution only (design.md §5 steps 1-5): eligible cohort -> guard ->
// derive -> group -> confirm in AGRESSO. NO WRITES. Classification against
// existing mapping rows (step 6: alreadyMapped / divergent / supersede) and
// apply are T-03's scope — this service's `resolved` bucket means "unique,
// exists in AGRESSO, not yet checked against existing mapping rows (the
// bilateral_project_mapping table) — step 6 is T-03's".

export interface AutomapperCandidate {
  clarisaProjectId: number;
  clarisaProjectFullName: string | null;
  externalCode: string | null;
  derivedContractId: string;
}

export interface AutomapperResolution {
  resolved: AutomapperCandidate[];
  ambiguous: AutomapperCandidate[];
  unresolved: AutomapperCandidate[];
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

  private hasExternalCode(project: ClarisaProject): boolean {
    return (
      project.external_code !== null &&
      project.external_code !== undefined &&
      String(project.external_code).trim() !== ''
    );
  }
}
