import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaProject } from '../../tools/clarisa/projects/dto/clarisa-project.types';
import { AgressoContract } from '../agresso-contract/entities/agresso-contract.entity';
import { LoggerUtil } from '../../shared/utils/logger.util';
import {
  detectExternalCodeCollisions,
  isAmbiguousNormalizedCode,
  normalizeExternalCode,
  ProjectExternalCodeEntry,
} from './utils/external-code.util';
import {
  ClarisaSplitsDto,
  CoverageReportDto,
  CoverageSamplesByTierDto,
  NormalizationReportDto,
  ResolutionDto,
} from './dto/coverage-report.dto';

// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-04 / R-CPA-004 / R-CPA-005
//
// SINGLETON-SCOPED BY DESIGN — see parent design.md §12 DD-11.
// Injects ClarisaProjectsService and DataSource ONLY.
// Do NOT inject AgressoContractRepository (it carries Scope.REQUEST via CurrentUserUtil).
//
// S1 reads only — zero mutations, zero migrations, zero persisted state.

const ALLIANCE_CENTERS = new Set(['CIAT', 'BIOVERSITY']);
const ALLIANCE_LEAD_ACRONYM = 'ABC';

@Injectable()
export class BilateralMappingCoverageService {
  private readonly logger = new LoggerUtil({
    name: BilateralMappingCoverageService.name,
  });

  constructor(
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly dataSource: DataSource,
  ) {}

  async getCoverageReport(
    phase?: number | string,
    limitSamples = 10,
  ): Promise<CoverageReportDto> {
    const host = process.env.ARI_CLARISA_HOST ?? '';
    const measuredAt = new Date().toISOString();
    const maxSamples =
      typeof limitSamples === 'number' && limitSamples > 0 ? limitSamples : 10;

    // Step 1 & 2: Fetch CLARISA projects (all and slice)
    const { all, slice, phaseUsed } =
      await this.clarisaProjectsService.listProjectsForCoverage(phase);

    // Compute CLARISA block (measurable on both paths)
    const clarisaSplits = this.computeClarisaSplits(all, slice, phaseUsed);

    // Step 3: Availability Guard (DD-3, R-CPA-005)
    // Check whether ANY project in all carries a non-null, non-empty external_code
    const upstreamContractAvailable = all.some(
      (p) =>
        p.external_code !== null &&
        p.external_code !== undefined &&
        String(p.external_code).trim() !== '',
    );

    if (!upstreamContractAvailable) {
      this.logger._warn(
        `[BilateralMappingCoverageService] upstream contract unavailable on host "${host}": no project in fetched payload carries external_code.`,
      );

      return {
        environment: {
          clarisa_host: host,
          upstream_contract_available: false,
        },
        measured_at: measuredAt,
        phase_used: phaseUsed,
        definitions: {
          bilateral_contract_predicate:
            "Active agresso_contracts with UPPER(funding_type) IN ('BLR', 'BILATERAL') and is_active = 1",
          normalization_rules:
            'Trim whitespace, upper-case, strip leading centre prefix from closed set {B-, C-} at most once',
        },
        clarisa: clarisaSplits,
        agresso: null,
        resolution: null,
        normalization: null,
        samples: null,
      };
    }

    // Step 4: Build code maps and detect collisions over slice
    const collisionEntries: ProjectExternalCodeEntry[] = [];
    const exactMap = new Map<string, number[]>();
    const fullNameMap = new Map<string, number[]>();

    for (const p of slice) {
      if (p.id === null || p.id === undefined) continue;
      const projectId = Number(p.id);

      if (
        p.external_code !== null &&
        p.external_code !== undefined &&
        String(p.external_code).trim() !== ''
      ) {
        const rawCode = String(p.external_code).trim().toUpperCase();
        collisionEntries.push({
          projectId,
          externalCode: p.external_code,
        });

        const existingExact = exactMap.get(rawCode);
        if (existingExact) {
          if (!existingExact.includes(projectId)) {
            existingExact.push(projectId);
          }
        } else {
          exactMap.set(rawCode, [projectId]);
        }
      }

      if (p.full_name && p.full_name.trim() !== '') {
        const normName = p.full_name.trim().toLowerCase();
        const existingNames = fullNameMap.get(normName);
        if (existingNames) {
          if (!existingNames.includes(projectId)) {
            existingNames.push(projectId);
          }
        } else {
          fullNameMap.set(normName, [projectId]);
        }
      }
    }

    const collisionResult = detectExternalCodeCollisions(collisionEntries);

    // Step 5: Read bilateral AGRESSO contracts via DataSource (DD-11, NFR-CPA-003)
    const contracts = await this.dataSource
      .getRepository(AgressoContract)
      .createQueryBuilder('contract')
      .select([
        'contract.agreement_id',
        'contract.funding_type',
        'contract.short_title',
        'contract.description',
      ])
      .where('contract.is_active = :isActive', { isActive: true })
      .andWhere('UPPER(contract.funding_type) IN (:...fundingTypes)', {
        fundingTypes: ['BLR', 'BILATERAL'],
      })
      .getMany();

    const total = contracts.length;

    // Step 6: Classify, first hit wins (EXACT_CODE -> NORMALIZED_CODE -> FULL_NAME -> UNRESOLVED; collided/multi -> AMBIGUOUS)
    let exactCount = 0;
    let normalizedCount = 0;
    let fullNameCount = 0;
    let ambiguousCount = 0;
    let unresolvedCount = 0;

    const samples: CoverageSamplesByTierDto = {
      EXACT_CODE: [],
      NORMALIZED_CODE: [],
      FULL_NAME: [],
      AMBIGUOUS: [],
      UNRESOLVED: [],
    };

    for (const contract of contracts) {
      const rawAgreementId = contract.agreement_id?.trim().toUpperCase() ?? '';

      if (!rawAgreementId) {
        unresolvedCount++;
        if (samples.UNRESOLVED.length < maxSamples) {
          samples.UNRESOLVED.push({
            agreement_id: contract.agreement_id ?? '',
            clarisa_project_id: null,
            matched_on: null,
          });
        }
        continue;
      }

      // Tier 1: EXACT_CODE
      const exactMatches = exactMap.get(rawAgreementId);
      if (exactMatches && exactMatches.length > 0) {
        if (exactMatches.length === 1) {
          exactCount++;
          if (samples.EXACT_CODE.length < maxSamples) {
            samples.EXACT_CODE.push({
              agreement_id: contract.agreement_id,
              clarisa_project_id: exactMatches[0],
              matched_on: rawAgreementId,
            });
          }
        } else {
          ambiguousCount++;
          if (samples.AMBIGUOUS.length < maxSamples) {
            samples.AMBIGUOUS.push({
              agreement_id: contract.agreement_id,
              clarisa_project_id: null,
              matched_on: rawAgreementId,
            });
          }
        }
        continue;
      }

      // Tier 2: NORMALIZED_CODE
      const { normalized } = normalizeExternalCode(rawAgreementId);
      if (normalized) {
        if (isAmbiguousNormalizedCode(normalized, collisionResult)) {
          ambiguousCount++;
          if (samples.AMBIGUOUS.length < maxSamples) {
            samples.AMBIGUOUS.push({
              agreement_id: contract.agreement_id,
              clarisa_project_id: null,
              matched_on: normalized,
            });
          }
          continue;
        }

        const normalizedMatches = collisionResult.normalizedMap.get(normalized);
        if (normalizedMatches && normalizedMatches.length > 0) {
          if (normalizedMatches.length === 1) {
            normalizedCount++;
            if (samples.NORMALIZED_CODE.length < maxSamples) {
              samples.NORMALIZED_CODE.push({
                agreement_id: contract.agreement_id,
                clarisa_project_id: Number(normalizedMatches[0]),
                matched_on: normalized,
              });
            }
          } else {
            ambiguousCount++;
            if (samples.AMBIGUOUS.length < maxSamples) {
              samples.AMBIGUOUS.push({
                agreement_id: contract.agreement_id,
                clarisa_project_id: null,
                matched_on: normalized,
              });
            }
          }
          continue;
        }
      }

      // Tier 3: FULL_NAME
      const nameMatches = new Set<number>();
      let matchedNameValue: string | null = null;

      if (contract.short_title && contract.short_title.trim() !== '') {
        const normTitle = contract.short_title.trim().toLowerCase();
        const matches = fullNameMap.get(normTitle);
        if (matches) {
          matchedNameValue = contract.short_title.trim();
          for (const id of matches) nameMatches.add(id);
        }
      }

      if (contract.description && contract.description.trim() !== '') {
        const normDesc = contract.description.trim().toLowerCase();
        const matches = fullNameMap.get(normDesc);
        if (matches) {
          if (!matchedNameValue) {
            matchedNameValue = contract.description.trim();
          }
          for (const id of matches) nameMatches.add(id);
        }
      }

      if (nameMatches.size > 0) {
        if (nameMatches.size === 1) {
          fullNameCount++;
          if (samples.FULL_NAME.length < maxSamples) {
            samples.FULL_NAME.push({
              agreement_id: contract.agreement_id,
              clarisa_project_id: Array.from(nameMatches)[0],
              matched_on: matchedNameValue,
            });
          }
        } else {
          ambiguousCount++;
          if (samples.AMBIGUOUS.length < maxSamples) {
            samples.AMBIGUOUS.push({
              agreement_id: contract.agreement_id,
              clarisa_project_id: null,
              matched_on: matchedNameValue,
            });
          }
        }
        continue;
      }

      // Tier 4: UNRESOLVED
      unresolvedCount++;
      if (samples.UNRESOLVED.length < maxSamples) {
        samples.UNRESOLVED.push({
          agreement_id: contract.agreement_id,
          clarisa_project_id: null,
          matched_on: null,
        });
      }
    }

    // Step 8: Assert the invariant (DD-6)
    const sum =
      exactCount +
      normalizedCount +
      fullNameCount +
      ambiguousCount +
      unresolvedCount;

    if (sum !== total) {
      throw new InternalServerErrorException(
        `Coverage report invariant violation: sum of tier counts (${sum}) does not equal total bilateral contracts (${total}).`,
      );
    }

    const calcPercentage = (count: number, denom: number): number => {
      if (denom === 0) return 0;
      return Number(((count / denom) * 100).toFixed(2));
    };

    const resolution: ResolutionDto = {
      EXACT_CODE: {
        count: exactCount,
        percentage: calcPercentage(exactCount, total),
        numerator: exactCount,
        denominator: total,
      },
      NORMALIZED_CODE: {
        count: normalizedCount,
        percentage: calcPercentage(normalizedCount, total),
        numerator: normalizedCount,
        denominator: total,
      },
      FULL_NAME: {
        count: fullNameCount,
        percentage: calcPercentage(fullNameCount, total),
        numerator: fullNameCount,
        denominator: total,
      },
      AMBIGUOUS: {
        count: ambiguousCount,
        percentage: calcPercentage(ambiguousCount, total),
        numerator: ambiguousCount,
        denominator: total,
      },
      UNRESOLVED: {
        count: unresolvedCount,
        percentage: calcPercentage(unresolvedCount, total),
        numerator: unresolvedCount,
        denominator: total,
      },
    };

    const normalization: NormalizationReportDto = {
      collision_count: collisionResult.collisionCount,
      collisions: collisionResult.collisions,
    };

    this.logger._log(
      `[BilateralMappingCoverageService] coverage report generated: phase=${phaseUsed}, slice_size=${slice.length}, contracts=${total}, exact=${exactCount}, normalized=${normalizedCount}, full_name=${fullNameCount}, ambiguous=${ambiguousCount}, unresolved=${unresolvedCount}, collisions=${collisionResult.collisionCount}, upstream_contract_available=true`,
    );

    return {
      environment: {
        clarisa_host: host,
        upstream_contract_available: true,
      },
      measured_at: measuredAt,
      phase_used: phaseUsed,
      definitions: {
        bilateral_contract_predicate:
          "Active agresso_contracts with UPPER(funding_type) IN ('BLR', 'BILATERAL') and is_active = 1",
        normalization_rules:
          'Trim whitespace, upper-case, strip leading centre prefix from closed set {B-, C-} at most once',
      },
      clarisa: clarisaSplits,
      agresso: {
        bilateral_contract_total: total,
      },
      resolution,
      normalization,
      samples,
    };
  }

  private computeClarisaSplits(
    all: readonly ClarisaProject[],
    slice: readonly ClarisaProject[],
    phaseUsed: number,
  ): ClarisaSplitsDto {
    const sourceCenterAcronym: Record<string, number> = {};
    const sourceOfFunding: Record<string, number> = {};
    let withMappings = 0;
    let withoutMappings = 0;
    let descPopulated = 0;
    let descEmpty = 0;
    let extCodePopulated = 0;
    let extCodeEmpty = 0;

    for (const p of slice) {
      const center = p.source_center_acronym
        ? p.source_center_acronym.trim().toUpperCase()
        : 'UNKNOWN';
      sourceCenterAcronym[center] = (sourceCenterAcronym[center] || 0) + 1;

      const funding = p.source_of_funding
        ? p.source_of_funding.trim().toUpperCase()
        : 'UNKNOWN';
      sourceOfFunding[funding] = (sourceOfFunding[funding] || 0) + 1;

      if (
        Array.isArray(p.project_mappings_array) &&
        p.project_mappings_array.length > 0
      ) {
        withMappings++;
      } else {
        withoutMappings++;
      }

      if (p.description && p.description.trim() !== '') {
        descPopulated++;
      } else {
        descEmpty++;
      }

      if (
        p.external_code !== null &&
        p.external_code !== undefined &&
        String(p.external_code).trim() !== ''
      ) {
        extCodePopulated++;
      } else {
        extCodeEmpty++;
      }
    }

    // alliance_selector_agreement computed over all (DD-10, DD-14)
    let bothSelectors = 0;
    let specSelectorOnly = 0;
    let legacySelectorOnly = 0;

    for (const p of all) {
      let inSpecSelector = false;
      if (
        p.source_center_acronym &&
        p.phase !== undefined &&
        p.phase !== null
      ) {
        const normalizedCenter = p.source_center_acronym.trim().toUpperCase();
        const numericPhase = Number(p.phase);
        inSpecSelector =
          ALLIANCE_CENTERS.has(normalizedCenter) &&
          !Number.isNaN(numericPhase) &&
          numericPhase === phaseUsed;
      }

      const inLegacySelector =
        p.lead_institution_object?.acronym === ALLIANCE_LEAD_ACRONYM;

      if (inSpecSelector && inLegacySelector) {
        bothSelectors++;
      } else if (inSpecSelector && !inLegacySelector) {
        specSelectorOnly++;
      } else if (!inSpecSelector && inLegacySelector) {
        legacySelectorOnly++;
      }
    }

    return {
      slice_size: slice.length,
      source_center_acronym: sourceCenterAcronym,
      source_of_funding: sourceOfFunding,
      has_project_mappings: {
        with_mappings: withMappings,
        without_mappings: withoutMappings,
      },
      description_populated: {
        populated: descPopulated,
        empty: descEmpty,
      },
      external_code_populated: {
        populated: extCodePopulated,
        empty: extCodeEmpty,
      },
      alliance_selector_agreement: {
        both_selectors: bothSelectors,
        spec_selector_only: specSelectorOnly,
        legacy_selector_only: legacySelectorOnly,
      },
    };
  }
}
