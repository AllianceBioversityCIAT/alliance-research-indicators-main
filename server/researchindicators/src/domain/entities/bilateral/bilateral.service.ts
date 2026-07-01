import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { ResultRepository } from '../results/repositories/result.repository';
import {
  AlignmentResponse,
  SelectedScienceProgramResponse,
  TocAlignmentInputDto,
  TocAlignmentReadbackResponse,
  UpdatePoolFundingAlignmentDto,
} from './dto/update-pool-funding-alignment.dto';
import { ClarisaScienceProgramsService } from '../../tools/clarisa/entities/clarisa-science-programs/clarisa-science-programs.service';
import { ClarisaProjectsService } from '../../tools/clarisa/projects/clarisa-projects.service';
import { ClarisaCgiarEntitiesService } from '../../tools/clarisa/cgiar-entities/clarisa-cgiar-entities.service';
import { PrmsTocService } from '../../tools/prms-toc/prms-toc.service';
import { BilateralProjectMappingService } from '../bilateral-project-mapping/bilateral-project-mapping.service';
import {
  BilateralScienceProgramItem,
  BilateralScienceProgramsResponse,
} from './dto/bilateral-science-programs.response.dto';
import {
  BilateralHlosIndicatorsResponse,
  BilateralSpCatalog,
  BilateralTocCatalogIndicator,
  BilateralTocCatalogResult,
} from './dto/bilateral-hlos-indicators.response.dto';
import { TocIntegrationService } from '../../tools/toc-integration/toc-integration.service';
import {
  TocIndicator,
  TocLevel,
  TocResult,
} from '../../tools/toc-integration/dto/toc-integration.types';
import {
  allowedLevelsFor,
  MAPPABLE_LIVE_VERSION,
  resolveResultTypeKey,
} from './utils/toc-level-rules.util';
import { ENV } from '../../shared/utils/env.utils';
import {
  IndicatorGroupResponse,
  IndicatorPanelIndicatorResponse,
  ListIndicatorsQueryDto,
} from './dto/list-indicators-query.dto';
import {
  ContributionDto,
  MappingResponse,
} from './dto/upsert-indicator-mapping.dto';
import { ReviewDecisionDto } from './dto/review-decision.dto';
import {
  PoolFundingAlignmentDetail,
  ResultPoolFundingAlignmentRepository,
} from './repositories/result-pool-funding-alignment.repository';
import {
  ResultPoolFundingTocAlignmentRepository,
  TocAlignmentUpsertInput,
} from './repositories/result-pool-funding-toc-alignment.repository';
import { ResultPoolFundingAlignment } from './entities/result-pool-funding-alignment.entity';
import { ResultPoolFundingTocAlignment } from './entities/result-pool-funding-toc-alignment.entity';
import { ResultPoolFundingAlignmentSp } from './entities/result-pool-funding-alignment-sp.entity';
import { ResultReviewHistory } from '../result-review-history/entities/result-review-history.entity';
import { ServerGateway } from '../../tools/socket/server.gateway';
import {
  PoolFundingIndicatorMappingDetail,
  ResultPoolFundingIndicatorMappingRepository,
} from './repositories/result-pool-funding-indicator-mapping.repository';
import { ResultPoolFundingIndicatorMapping } from './entities/result-pool-funding-indicator-mapping.entity';
import { BilateralIndicatorTypeHandler } from './handlers/bilateral-indicator-type-handler.interface';
import { CapacitySharingBilateralIndicatorTypeHandler } from './handlers/capacity-sharing.handler';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './handlers/innovation-development.handler';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './handlers/knowledge-product.handler';
import { NoopBilateralIndicatorTypeHandler } from './handlers/noop.handler';
import { PolicyChangeBilateralIndicatorTypeHandler } from './handlers/policy-change.handler';

const POOL_FUNDING_ALIGNMENT_CHANGED = 'POOL_FUNDING_ALIGNMENT_CHANGED';
const INDICATOR_MAPPING_CHANGED = 'INDICATOR_MAPPING_CHANGED';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-094
// Per-alignment validation error item surfaced as `errors.toc_alignments`
// on the atomic 400 (design §5; D-V2-8).
interface TocAlignmentValidationError {
  sp_code: string;
  field: string;
  error:
    | 'duplicate_sp_code'
    | 'sp_not_selected'
    | 'missing_required_fields'
    | 'level_not_allowed'
    | 'unknown_toc_result_id'
    | 'unknown_indicator_id';
}

/**
 * SINGLETON-SCOPED BY DESIGN — see docs/specs/bilateral-module/design.md §3.4 Constraint A.
 *
 * DO NOT inject CurrentUserUtil, ResultsUtil, or any other REQUEST-scoped provider
 * into this class. Doing so would force BilateralService into REQUEST scope, which
 * cascades through the ResultsService ↔ ResultOicrService forwardRef cycle and
 * produces empty-shell ResultsService instances at request time (breaks v2/results).
 *
 * User info and the per-request resultId are passed as method parameters from
 * BilateralController, which IS allowed to be REQUEST-scoped.
 */
@Injectable()
export class BilateralService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly resultRepository: ResultRepository,
    private readonly alignmentRepository: ResultPoolFundingAlignmentRepository,
    private readonly mappingRepository: ResultPoolFundingIndicatorMappingRepository,
    private readonly serverGateway: ServerGateway,
    private readonly capacitySharingHandler: CapacitySharingBilateralIndicatorTypeHandler,
    private readonly innovationDevelopmentHandler: InnovationDevelopmentBilateralIndicatorTypeHandler,
    private readonly knowledgeProductHandler: KnowledgeProductBilateralIndicatorTypeHandler,
    private readonly noopHandler: NoopBilateralIndicatorTypeHandler,
    private readonly policyChangeHandler: PolicyChangeBilateralIndicatorTypeHandler,
    private readonly clarisaScienceProgramsService: ClarisaScienceProgramsService,
    private readonly clarisaProjectsService: ClarisaProjectsService,
    private readonly clarisaCgiarEntitiesService: ClarisaCgiarEntitiesService,
    private readonly bilateralProjectMappingService: BilateralProjectMappingService,
    private readonly prmsTocService: PrmsTocService,
    private readonly tocIntegrationService: TocIntegrationService,
    // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092
    private readonly tocAlignmentRepository: ResultPoolFundingTocAlignmentRepository,
  ) {}

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.11 / R-BIL-076 / R-BIL-078
   *
   * Per-result Science Programs picker source. Chain:
   *   result → result_contracts (primary, active) → agresso_contracts.agreement_id
   *          → bilateral_project_mapping (active) → CLARISA project_mappings_array
   *
   * Filters: Confirmed + active portfolio + Science Program codes (prefix `SP`
   * or `SPxx` smo_code). Same rules as `deriveSciencePrograms` so every picker
   * SP has a matching ToC catalog branch in `getHlosIndicatorsForResult`.
   *
   * Always returns 200. `mapping_status === "unmapped"` covers both
   * "no AGRESSO contract" and "no active mapping row" — the FE renders the
   * same affordance either way ("Contact admin to link this contract").
   */
  async getScienceProgramsForResult(
    resultId: number,
    resultCode: string,
  ): Promise<BilateralScienceProgramsResponse> {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const agreementId = context.agresso_agreement_id?.trim();
    const baseResponse = {
      result_code: String(context.result_official_code ?? resultCode),
    };

    if (!agreementId) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        science_programs: [],
      };
    }

    const mapping =
      await this.bilateralProjectMappingService.findActiveByAgreementId(
        agreementId,
      );

    if (!mapping) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        science_programs: [],
      };
    }

    const project = await this.clarisaProjectsService.findProjectById(
      mapping.clarisa_project_id,
    );

    if (!project) {
      // Mapping points at a project CLARISA no longer exposes — treat as
      // unmapped from the picker's perspective, but surface the snapshot
      // we have so ops can spot the drift.
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: {
          id: mapping.clarisa_project_id,
          short_name: mapping.clarisa_project_short_name ?? '',
        },
        science_programs: [],
      };
    }

    const activePortfolio = ENV.BILATERAL_ACTIVE_PORTFOLIO;
    const derived = this.deriveSciencePrograms(project);
    const catalog = await this.clarisaScienceProgramsService.findAll();
    const catalogByCode = new Map(catalog.map((sp) => [sp.official_code, sp]));
    const metaByCode = this.deriveScienceProgramMetaByCode(project);

    const science_programs: BilateralScienceProgramItem[] = derived.map(
      ({ code, name }) => {
        const fallback = catalogByCode.get(code);
        const meta = metaByCode.get(code);
        return {
          code,
          name,
          category:
            meta?.category ?? fallback?.category ?? null,
          color: fallback?.color ?? null,
          icon_key: fallback?.icon_key ?? null,
          allocation: meta?.allocation ?? null,
        };
      },
    );

    return {
      ...baseResponse,
      mapping_status: 'mapped',
      clarisa_project: { id: project.id, short_name: project.short_name },
      science_programs,
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090, R-BIL-091, R-BIL-097
   *
   * ToC catalog read for the per-SP alignment panel, in the FROZEN FE
   * envelope (design §5 / §6.1). Flow:
   *
   *   1. Resolve context (`findPoolFundingAlignmentContext`) — 404 if absent.
   *   2. `result_type` + `allowed_levels` from `toc-level-rules.util.ts`
   *      (single source of truth, D-V2-3) off the result's indicator type.
   *   3. `version_locked` = live version year (`context.report_year_id`,
   *      literal year per D-V2-7) ≠ `MAPPABLE_LIVE_VERSION` (2026).
   *   4. SP chain UNCHANGED: result → AGRESSO → bilateral_project_mapping
   *      → CLARISA project → `deriveSciencePrograms`. Unmapped at any step
   *      ⇒ `mapping_status: 'unmapped'`, `catalogs: []`, zero upstream ToC
   *      calls (`clarisa_project` keeps the per-step null/snapshot-ref
   *      semantics so ops can spot mapping drift).
   *   5. Mapped but `allowed_levels: []` or no SPs ⇒ `catalogs: []`, zero
   *      upstream calls (R-BIL-091 AC.2).
   *   6. Else fan out `TocIntegrationService.getTocResultsForSps` (lambda-toc,
   *      cached; cold-cache failure propagates as 503) and assemble one
   *      `catalogs[]` entry per SP (deterministic SP order), each with one
   *      `levels[]` entry per allowed level — an upstream `{"response":[]}`
   *      keeps its level entry with `toc_results: []` (R-BIL-090 AC.5).
   *
   * The legacy (SP, AOW)-pair PRMS fan-out (`pairs` / `aow_status` /
   * `no_aow_mappings`) is gone from this flow (R-BIL-090 AC.2); its physical
   * removal is gated T-10 (R-BIL-098).
   */
  async getHlosIndicatorsForResult(
    resultId: number,
    resultCode: string,
  ): Promise<BilateralHlosIndicatorsResponse> {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const resultType = resolveResultTypeKey(context.indicator_id);
    const allowedLevels = allowedLevelsFor(resultType);

    const baseResponse = {
      result_code: String(context.result_official_code ?? resultCode),
      result_type: resultType,
      allowed_levels: allowedLevels,
      // D-V2-7: `report_year_id` carries the literal report year (e.g. 2026).
      version_locked: Number(context.report_year_id) !== MAPPABLE_LIVE_VERSION,
    };
    const agreementId = context.agresso_agreement_id?.trim();

    if (!agreementId) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        catalogs: [],
      };
    }

    const mapping =
      await this.bilateralProjectMappingService.findActiveByAgreementId(
        agreementId,
      );

    if (!mapping) {
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: null,
        catalogs: [],
      };
    }

    const project = await this.clarisaProjectsService.findProjectById(
      mapping.clarisa_project_id,
    );

    if (!project) {
      // Mapping points at a project CLARISA no longer exposes — treat as
      // unmapped, but surface the snapshot we have so ops can spot the drift.
      return {
        ...baseResponse,
        mapping_status: 'unmapped',
        clarisa_project: {
          id: mapping.clarisa_project_id,
          short_name: mapping.clarisa_project_short_name ?? '',
        },
        catalogs: [],
      };
    }

    const projectRef = { id: project.id, short_name: project.short_name };
    const spCodes = this.deriveSciencePrograms(project).map((p) => p.code);

    if (!spCodes.length || !allowedLevels.length) {
      // Mapped, but nothing to fetch: no Confirmed SP in the active
      // portfolio, or the result type maps to no allowed levels (pending
      // OQ-V2-5). Zero upstream calls either way (design §6.1 step 4).
      return {
        ...baseResponse,
        mapping_status: 'mapped',
        clarisa_project: projectRef,
        catalogs: [],
      };
    }

    const tocResultsByKey =
      await this.tocIntegrationService.getTocResultsForSps(
        spCodes,
        allowedLevels,
      );

    // One catalogs[] entry per SP (deriveSciencePrograms order), each with
    // one levels[] entry per allowed level (allowedLevelsFor order). Empty
    // upstream catalogs keep their level entry — never filtered out.
    const catalogs: BilateralSpCatalog[] = spCodes.map((spCode) => ({
      sp_code: spCode,
      levels: allowedLevels.map((level) => ({
        level,
        toc_results: (tocResultsByKey.get(`${spCode}:${level}`) ?? []).map(
          (tocResult) => this.toWireTocResult(tocResult, level),
        ),
      })),
    }));

    return {
      ...baseResponse,
      mapping_status: 'mapped',
      clarisa_project: projectRef,
      catalogs,
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090
   *
   * Upstream `TocResult` → frozen wire shape (design §6.1 step 6):
   * `wp_short_name` → `aow_code` (forced null at `EOI` level).
   */
  private toWireTocResult(
    tocResult: TocResult,
    level: TocLevel,
  ): BilateralTocCatalogResult {
    return {
      toc_result_id: tocResult.toc_result_id,
      title: tocResult.title,
      description: tocResult.description ?? '',
      aow_code: level === 'EOI' ? null : (tocResult.wp_short_name ?? null),
      indicators: (tocResult.indicators ?? []).map((indicator) =>
        this.toWireTocIndicator(indicator),
      ),
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 / R-BIL-090
   *
   * Upstream `TocIndicator` → frozen wire shape: `unit_messurament` →
   * `unit_of_measurement` (D-V2-4); `targets[]` resolved to the single
   * `MAPPABLE_LIVE_VERSION` entry — `(target_value, 2026)` when an upstream
   * target with `target_date == '2026'` exists, `(null, 2026)` otherwise.
   * The raw targets array never reaches the wire (R-BIL-090 AC.3).
   * `type_value` passes through unfiltered (OQ-V2-2).
   */
  private toWireTocIndicator(
    indicator: TocIndicator,
  ): BilateralTocCatalogIndicator {
    return {
      indicator_id: indicator.indicator_id,
      indicator_description: indicator.indicator_description,
      unit_of_measurement: indicator.unit_messurament ?? '',
      type_value: indicator.type_value ?? '',
      target_value: this.resolveLiveTargetValue(indicator),
      target_year: MAPPABLE_LIVE_VERSION,
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-03 + T-06 / R-BIL-090, R-BIL-095
   *
   * Shared target resolution for the live version: the upstream `targets[]`
   * entry with `target_date == '2026'` wins, else null. Used by both the
   * catalog read wire mapping and the write-path snapshot copy so saved
   * snapshots always match what the FE was shown.
   */
  private resolveLiveTargetValue(indicator: TocIndicator): string | null {
    const liveTarget = (indicator.targets ?? []).find(
      (target) => target.target_date === String(MAPPABLE_LIVE_VERSION),
    );
    return liveTarget?.target_value ?? null;
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.12
   *
   * Extracts the Science Programs from a CLARISA project's
   * `project_mappings_array[]`: Confirmed, prefix "SP" (or `SPxx` smo_code when
   * prefix is absent), in the active portfolio. Returns code + display name,
   * deduped by code and sorted. AOW rows are excluded. Level is not required —
   * lambda-toc is keyed by initiative code (e.g. SP09) regardless of mapping level.
   */
  private deriveSciencePrograms(project: {
    project_mappings_array?: Array<{
      status?: string;
      global_unit_object?: {
        smo_code?: string;
        name?: string;
        cgiar_entity_type_object?: { prefix?: string | null };
        portfolio_object?: { acronym?: string };
      };
    }>;
  }): Array<{ code: string; name: string }> {
    const activePortfolio = ENV.BILATERAL_ACTIVE_PORTFOLIO;
    const mappings = project.project_mappings_array ?? [];
    const nameByCode = new Map<string, string>();

    for (const m of mappings) {
      const u = m.global_unit_object;
      if (!u?.smo_code || !this.isProjectScienceProgramMapping(m, activePortfolio)) {
        continue;
      }
      if (!nameByCode.has(u.smo_code)) {
        nameByCode.set(u.smo_code, (u.name ?? u.smo_code).trim());
      }
    }

    return [...nameByCode.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * True when a CLARISA project mapping row represents a Science Program for the
   * bilateral picker / ToC catalog (not an Area of Work).
   */
  private isProjectScienceProgramMapping(
    mapping: {
      status?: string;
      global_unit_object?: {
        smo_code?: string;
        cgiar_entity_type_object?: { prefix?: string | null };
        portfolio_object?: { acronym?: string };
      };
    },
    activePortfolio: string,
  ): boolean {
    const u = mapping.global_unit_object;
    if (!u?.smo_code || mapping.status !== 'Confirmed') return false;
    if (u.portfolio_object?.acronym !== activePortfolio) return false;

    const prefix = u.cgiar_entity_type_object?.prefix?.toUpperCase();
    if (prefix === 'AOW') return false;
    return /^SP\d/i.test(u.smo_code.trim());
  }

  /**
   * Display metadata (allocation, category) for SPs that pass deriveSciencePrograms.
   * Uses the same four filters so the picker and ToC catalog always agree on SP codes.
   */
  private deriveScienceProgramMetaByCode(project: {
    project_mappings_array?: Array<{
      status?: string;
      allocation?: number;
      global_unit_object?: {
        smo_code?: string;
        cgiar_entity_type_object?: { prefix?: string | null; name?: string | null };
        portfolio_object?: { acronym?: string };
      };
    }>;
  }): Map<string, { allocation: number | null; category: string | null }> {
    const activePortfolio = ENV.BILATERAL_ACTIVE_PORTFOLIO;
    const metaByCode = new Map<
      string,
      { allocation: number | null; category: string | null }
    >();

    for (const m of project.project_mappings_array ?? []) {
      const u = m.global_unit_object;
      if (!u?.smo_code || !this.isProjectScienceProgramMapping(m, activePortfolio)) {
        continue;
      }
      if (!metaByCode.has(u.smo_code)) {
        metaByCode.set(u.smo_code, {
          allocation: typeof m.allocation === 'number' ? m.allocation : null,
          category: u.cgiar_entity_type_object?.name ?? null,
        });
      }
    }

    return metaByCode;
  }

  async getAlignment(
    resultId: number,
    resultCode: string,
    _user: User,
  ): Promise<AlignmentResponse> {
    const [context, alignment, tocAlignmentRows] = await Promise.all([
      this.resultRepository.findPoolFundingAlignmentContext(resultId),
      this.alignmentRepository.findActiveAlignmentByResultId(resultId),
      // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096, R-BIL-095
      // Read-back rows come EXCLUSIVELY from the local snapshot table —
      // zero TocIntegrationService / upstream involvement on this path,
      // so saved mappings survive catalog drift (R-BIL-095 AC.1).
      this.tocAlignmentRepository.findActiveByResultId(resultId),
    ]);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    const eligible = this.toBoolean(context.is_pool_funding_contributor);
    const isSyncedToPrms = this.toBoolean(context.is_synced_to_prms);
    // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
    // Source-based gate: any PRMS-sourced result is read-only on bilateral
    // surfaces regardless of sync state. Unions with the existing R-BIL-015
    // synced gate so the FE only needs to read `is_read_only`.
    const isPrmsSourced = this.isPrmsSourced(context.platform_code);
    const visibleAlignment = eligible ? alignment : null;
    const selectedLevers = visibleAlignment?.selected_levers ?? [];
    const selectedSciencePrograms = await this.toSelectedSciencePrograms(
      selectedLevers.map((lever) => lever.lever_code),
    );

    return {
      result_code: String(context.result_official_code ?? resultCode),
      eligible,
      has_pool_funding_alignment_eligible: eligible,
      has_contribution: visibleAlignment?.has_contribution ?? null,
      selected_levers: selectedLevers,
      selected_science_programs: selectedSciencePrograms,
      is_synced_to_prms: isSyncedToPrms,
      is_read_only: isPrmsSourced || isSyncedToPrms,
      // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096, R-BIL-097
      // Same Number(...) comparison as the hlos-indicators read (D-V2-7);
      // `toc_alignments` follows the same eligibility visibility gate as
      // the rest of the alignment payload (mirrors `visibleAlignment`).
      version_locked: Number(context.report_year_id) !== MAPPABLE_LIVE_VERSION,
      toc_alignments: (eligible ? tocAlignmentRows : []).map((row) =>
        this.toTocAlignmentReadback(row),
      ),
    };
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-07 / R-BIL-096, R-BIL-095
   *
   * Saved per-SP ToC alignment row → frozen §5 read-back shape (D-V2-5).
   * Snapshot columns only — never live upstream data (R-BIL-095 AC.1):
   * `unit_messurament` (verbatim upstream spelling at rest, D-V2-4) is
   * renamed to `unit_of_measurement` at the wire, and
   * `quantitative_contribution` (MySQL decimal — surfaced as a string by
   * the driver, no entity transformer) is coerced back to a number so the
   * wire type holds.
   */
  private toTocAlignmentReadback(
    row: ResultPoolFundingTocAlignment,
  ): TocAlignmentReadbackResponse {
    return {
      sp_code: row.sp_code,
      aligns_with_toc: this.toBoolean(row.aligns_with_toc),
      level: (row.level as TocLevel) ?? null,
      toc_result_id: row.toc_result_id ?? null,
      indicator_id: row.indicator_id ?? null,
      quantitative_contribution:
        row.quantitative_contribution === null ||
        row.quantitative_contribution === undefined
          ? null
          : Number(row.quantitative_contribution),
      toc_result_title: row.toc_result_title ?? null,
      indicator_description: row.indicator_description ?? null,
      unit_of_measurement: row.unit_messurament ?? null,
      target_value: row.target_value ?? null,
      target_year: row.target_year ?? null,
    };
  }

  private async toSelectedSciencePrograms(
    codes: string[],
  ): Promise<SelectedScienceProgramResponse[]> {
    if (!codes.length) return [];

    const catalog = await this.clarisaScienceProgramsService.findAll();
    const byCode = new Map(catalog.map((sp) => [sp.official_code, sp]));

    return codes.map((code) => {
      const match = byCode.get(code);
      return {
        code,
        name: match?.name ?? code,
        category: match?.category ?? null,
        color: match?.color ?? null,
        icon_key: match?.icon_key ?? null,
      };
    });
  }

  async updateAlignment(
    resultId: number,
    resultCode: string,
    dto: UpdatePoolFundingAlignmentDto,
    user: User,
  ): Promise<AlignmentResponse> {
    const [context, previousAlignment] = await Promise.all([
      this.resultRepository.findPoolFundingAlignmentContext(resultId),
      this.alignmentRepository.findActiveAlignmentByResultId(resultId),
    ]);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    // R-BIL-071: architectural source gate runs first — PRMS owns the data
    // regardless of contributor status or sync state, so reject before any
    // domain-eligibility check fires (avoids leaking "not a contributor"
    // when the real reason is "we don't own this result").
    this.assertPrmsSourceWritable(context.platform_code);

    if (!this.toBoolean(context.is_pool_funding_contributor)) {
      throw new BadRequestException(
        'Result project is not a Pool Funding Contributor',
      );
    }

    if (this.toBoolean(context.is_synced_to_prms)) {
      throw new ConflictException('Result is already synced to PRMS');
    }

    const leverCodes = await this.normalizeLeverCodes(
      dto,
      resultId,
      resultCode,
    );

    // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092..094, R-BIL-097
    //
    // ToC alignment gate + validation run BEFORE the transaction so nothing
    // is persisted on any 400/409/503 path (atomic — D-V2-8; a cold-cache
    // catalog failure during validation propagates as 503 with zero writes).
    // Legacy bodies (no `toc_alignments`) bypass the gate entirely
    // (R-BIL-097 AC.3): `tocUpserts` stays null and no ToC row is touched
    // beyond the R-BIL-093 cascade below.
    const tocUpserts = dto.toc_alignments
      ? await this.validateTocAlignments(
          dto.toc_alignments,
          leverCodes,
          context,
          resultId,
        )
      : null;

    // R-BIL-093 cascade input: active ToC rows whose SP is no longer in the
    // effective sp_codes are soft-deactivated in the same transaction. This
    // runs for legacy bodies too — the cascade is keyed off `sp_codes`
    // changes, not off `toc_alignments` presence, so dropping an SP never
    // leaves its ToC alignment dangling (R-BIL-093 AC.1).
    const effectiveSpCodes = new Set(leverCodes);
    const tocSpCodesToDeactivate = (
      await this.tocAlignmentRepository.findActiveByResultId(resultId)
    )
      .map((row) => row.sp_code)
      .filter((spCode) => !effectiveSpCodes.has(spCode));

    const actorUserId = user.sec_user_id;
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      if (previousAlignment) {
        await manager.getRepository(ResultPoolFundingAlignmentSp).update(
          {
            alignment_id: previousAlignment.id,
            is_active: true,
          },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
        await manager.getRepository(ResultPoolFundingAlignment).update(
          {
            id: previousAlignment.id,
            is_active: true,
          },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
      }

      const newAlignment = await manager
        .getRepository(ResultPoolFundingAlignment)
        .save({
          result_id: resultId,
          has_contribution: dto.has_contribution,
          created_by: actorUserId,
          updated_by: actorUserId,
        });

      if (leverCodes.length) {
        await manager.getRepository(ResultPoolFundingAlignmentSp).save(
          leverCodes.map((spCode) => ({
            alignment_id: newAlignment.id,
            // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.3
            // / R-BIL-073 — entity property renamed `lever_code` → `sp_code`.
            sp_code: spCode,
            created_by: actorUserId,
            updated_by: actorUserId,
          })),
        );
      }

      // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092, R-BIL-093, R-BIL-095
      //
      // Independent per-SP upsert (design §6.3 step 4): each validated entry
      // updates/creates ONLY its own (result, sp_code) row — SPs absent from
      // `toc_alignments` are never touched (R-BIL-092 AC.1). Then the
      // cascade (step 5) deactivates rows for deselected SPs.
      if (tocUpserts) {
        for (const upsert of tocUpserts) {
          await this.tocAlignmentRepository.upsertForSp(
            upsert,
            actorUserId,
            manager,
          );
        }
      }

      if (tocSpCodesToDeactivate.length) {
        await this.tocAlignmentRepository.deactivateForSps(
          resultId,
          tocSpCodesToDeactivate,
          actorUserId,
          manager,
        );
      }

      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: POOL_FUNDING_ALIGNMENT_CHANGED,
        justification: dto.justification,
        payload_before: this.toHistoryPayload(previousAlignment),
        payload_after: {
          has_contribution: dto.has_contribution,
          lever_codes: leverCodes,
          // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06
          // (design §6.3 step 6) — the history entry mentions the ToC
          // alignment change ONLY when `toc_alignments` was submitted;
          // legacy bodies keep the payload byte-identical to before.
          ...(dto.toc_alignments
            ? {
                toc_alignments: dto.toc_alignments.map((entry) => ({
                  sp_code: entry.sp_code,
                  aligns_with_toc: entry.aligns_with_toc,
                  level: entry.level ?? null,
                  toc_result_id: entry.toc_result_id ?? null,
                  indicator_id: entry.indicator_id ?? null,
                  quantitative_contribution:
                    entry.quantitative_contribution ?? null,
                })),
              }
            : {}),
        },
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });

    const response = await this.getAlignment(resultId, resultCode, user);
    this.serverGateway.emitPoolFundingAlignmentChanged({
      result_code: response.result_code,
      by_user_id: actorUserId,
      at: new Date().toISOString(),
    });

    return response;
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-06 / R-BIL-092, R-BIL-094, R-BIL-095, R-BIL-097
   *
   * Pre-transaction gate + validation for `toc_alignments[]` (design §6.3
   * steps 2a–2d). Returns the per-SP upsert inputs with snapshots already
   * resolved from the validated catalog entries, so the transaction only
   * persists — it never re-reads upstream.
   *
   *   a. Version gate: live version (`report_year_id`, literal year per
   *      D-V2-7) ≠ 2026 → 409 `toc_mapping_version_locked` (R-BIL-097).
   *   b. Structural validation — `duplicate_sp_code`, `sp_not_selected`,
   *      `missing_required_fields` — collected per alignment.
   *   c. Catalog validation per "Yes" entry — `level_not_allowed`, then
   *      `(toc_result_id, indicator_id)` existence in the cached (sp, level)
   *      catalog → `unknown_toc_result_id` / `unknown_indicator_id`.
   *      Catalogs are fetched ONLY for the (sp, level) combos actually
   *      referenced; a cold-cache upstream failure propagates as 503 with
   *      nothing persisted (R-BIL-094).
   *   d. ANY collected error → single 400 carrying ALL per-alignment errors
   *      as `errors.toc_alignments` (atomic — D-V2-8). The legacy
   *      `errors.unknown_sp_codes` contract is untouched (it fires earlier,
   *      from `normalizeLeverCodes`).
   *
   * Snapshots (R-BIL-095): "Yes" rows copy `toc_result_title`,
   * `indicator_description`, `unit_messurament` (verbatim upstream spelling,
   * D-V2-4) and the 2026-resolved `(target_value, target_year)` from the
   * validated catalog entry. "No" rows null every ToC/snapshot column.
   */
  private async validateTocAlignments(
    alignments: TocAlignmentInputDto[],
    effectiveSpCodes: string[],
    context: { report_year_id?: number | string; indicator_id?: number },
    resultId: number,
  ): Promise<TocAlignmentUpsertInput[]> {
    if (Number(context.report_year_id) !== MAPPABLE_LIVE_VERSION) {
      // GlobalExceptions surfaces `exception.response.message` into the
      // envelope's `errors` field — same packing as the unknown_sp_codes 400.
      throw new ConflictException({
        message: {
          description: `ToC mapping is locked to live version ${MAPPABLE_LIVE_VERSION}`,
          code: 'toc_mapping_version_locked',
        },
      });
    }

    const errors: TocAlignmentValidationError[] = [];
    const effective = new Set(effectiveSpCodes);
    const allowedLevels = new Set(
      allowedLevelsFor(resolveResultTypeKey(context.indicator_id)),
    );

    const occurrences = new Map<string, number>();
    for (const entry of alignments) {
      occurrences.set(entry.sp_code, (occurrences.get(entry.sp_code) ?? 0) + 1);
    }
    for (const [spCode, count] of occurrences) {
      if (count > 1) {
        errors.push({
          sp_code: spCode,
          field: 'sp_code',
          error: 'duplicate_sp_code',
        });
      }
    }

    const catalogChecks: TocAlignmentInputDto[] = [];
    for (const entry of alignments) {
      if (!effective.has(entry.sp_code)) {
        errors.push({
          sp_code: entry.sp_code,
          field: 'sp_code',
          error: 'sp_not_selected',
        });
        continue;
      }

      if (!entry.aligns_with_toc) {
        continue;
      }

      const missingFields = (
        ['level', 'toc_result_id', 'indicator_id'] as const
      ).filter((field) => entry[field] === undefined || entry[field] === null);
      if (missingFields.length) {
        for (const field of missingFields) {
          errors.push({
            sp_code: entry.sp_code,
            field,
            error: 'missing_required_fields',
          });
        }
        continue;
      }

      if (!allowedLevels.has(entry.level)) {
        errors.push({
          sp_code: entry.sp_code,
          field: 'level',
          error: 'level_not_allowed',
        });
        continue;
      }

      catalogChecks.push(entry);
    }

    // Fetch ONLY the (sp, level) combos actually referenced by validated
    // "Yes" entries — each through the cached client (NFR-BIL-090/091).
    const combos = new Map<string, { sp: string; level: TocLevel }>();
    for (const entry of catalogChecks) {
      combos.set(`${entry.sp_code}:${entry.level}`, {
        sp: entry.sp_code,
        level: entry.level,
      });
    }
    const comboKeys = [...combos.keys()];
    const catalogs = await Promise.all(
      comboKeys.map((key) => {
        const combo = combos.get(key);
        return this.tocIntegrationService.getTocResults(combo.sp, combo.level);
      }),
    );
    const catalogByKey = new Map(
      comboKeys.map((key, index) => [key, catalogs[index]]),
    );

    const validatedCatalogRefs = new Map<
      string,
      { tocResult: TocResult; indicator: TocIndicator }
    >();
    for (const entry of catalogChecks) {
      const catalog = catalogByKey.get(`${entry.sp_code}:${entry.level}`) ?? [];
      const tocResult = catalog.find(
        (candidate) => candidate.toc_result_id === entry.toc_result_id,
      );
      if (!tocResult) {
        errors.push({
          sp_code: entry.sp_code,
          field: 'toc_result_id',
          error: 'unknown_toc_result_id',
        });
        continue;
      }

      const indicator = (tocResult.indicators ?? []).find(
        (candidate) => candidate.indicator_id === entry.indicator_id,
      );
      if (!indicator) {
        errors.push({
          sp_code: entry.sp_code,
          field: 'indicator_id',
          error: 'unknown_indicator_id',
        });
        continue;
      }

      validatedCatalogRefs.set(entry.sp_code, { tocResult, indicator });
    }

    if (errors.length) {
      throw new BadRequestException({
        message: {
          description: 'Invalid ToC alignments',
          toc_alignments: errors,
        },
      });
    }

    return alignments.map((entry) => {
      if (!entry.aligns_with_toc) {
        // Explicit "No": ToC refs + snapshot columns are nulled
        // (R-BIL-092 AC.2, R-BIL-095 AC.2).
        return {
          result_id: resultId,
          sp_code: entry.sp_code,
          aligns_with_toc: false,
        };
      }

      const { tocResult, indicator } = validatedCatalogRefs.get(entry.sp_code);
      return {
        result_id: resultId,
        sp_code: entry.sp_code,
        aligns_with_toc: true,
        level: entry.level,
        toc_result_id: entry.toc_result_id,
        indicator_id: entry.indicator_id,
        quantitative_contribution: entry.quantitative_contribution ?? null,
        toc_result_title: tocResult.title,
        indicator_description: indicator.indicator_description,
        unit_messurament: indicator.unit_messurament ?? null,
        target_value: this.resolveLiveTargetValue(indicator),
        target_year: MAPPABLE_LIVE_VERSION,
      };
    });
  }

  async listIndicators(
    resultId: number,
    resultCode: string,
    query: ListIndicatorsQueryDto,
    user: User,
  ): Promise<IndicatorGroupResponse[]> {
    const alignment = await this.getAlignment(resultId, resultCode, user);

    if (!alignment.has_contribution) {
      return [];
    }

    const staleMappings =
      await this.mappingRepository.findActiveStaleMappingsByResultAndLevers(
        resultId,
        alignment.selected_levers.map((lever) => lever.lever_code),
      );
    const staleIndicatorsByLever = staleMappings.reduce((groups, mapping) => {
      const indicator = this.toStaleIndicatorResponse(mapping);

      if (this.matchesIndicatorQuery(indicator, query)) {
        groups.set(mapping.lever_code, [
          ...(groups.get(mapping.lever_code) ?? []),
          indicator,
        ]);
      }

      return groups;
    }, new Map<string, IndicatorPanelIndicatorResponse[]>());

    return alignment.selected_levers.map((lever) => ({
      lever_code: lever.lever_code,
      lever_name: lever.lever_name,
      indicators: staleIndicatorsByLever.get(lever.lever_code) ?? [],
    }));
  }

  async markIndicatorMappingsStale(
    leverCode: string,
    indicatorCode: string,
    user?: User,
  ): Promise<number> {
    const normalizedLeverCode = leverCode?.trim();
    const normalizedIndicatorCode = indicatorCode?.trim();

    if (!normalizedLeverCode || !normalizedIndicatorCode) {
      throw new BadRequestException(
        'Lever code and indicator code are required to mark mappings stale',
      );
    }

    const actorUserId = user.sec_user_id;

    return this.mappingRepository.markActiveMappingsStaleByLeverIndicator(
      normalizedLeverCode,
      normalizedIndicatorCode,
      actorUserId,
    );
  }

  async upsertContribution(
    resultId: number,
    resultCode: string,
    indicatorCode: string,
    dto: ContributionDto,
    user: User,
    leverCode: string,
  ): Promise<MappingResponse> {
    const context = await this.getEditableContributionContext(resultId);
    const alignment = await this.getActiveAlignmentForLever(
      resultId,
      leverCode,
    );
    const handler = this.getContributionHandler(dto.indicator_type ?? dto.type);
    const previousMapping =
      await this.mappingRepository.findActiveMappingByResultLeverIndicator(
        resultId,
        leverCode,
        indicatorCode,
      );
    const actorUserId = user.sec_user_id;
    const now = new Date();

    let savedMapping: ResultPoolFundingIndicatorMapping;
    await this.dataSource.transaction(async (manager) => {
      if (previousMapping) {
        await manager.getRepository(ResultPoolFundingIndicatorMapping).update(
          { id: previousMapping.id, is_active: true },
          {
            is_active: false,
            deleted_at: now,
            updated_by: actorUserId,
          },
        );
      }

      const handlerResult = await handler.upsert(
        { resultId, resultCode, indicatorCode, manager },
        dto,
      );
      savedMapping = await manager
        .getRepository(ResultPoolFundingIndicatorMapping)
        .save({
          result_id: resultId,
          lever_code: leverCode,
          indicator_code: indicatorCode,
          indicator_type: handler.indicatorType,
          result_capacity_sharing_id:
            handlerResult.fkField === 'result_capacity_sharing_id'
              ? handlerResult.fkId
              : null,
          result_knowledge_product_id:
            handlerResult.fkField === 'result_knowledge_product_id'
              ? handlerResult.fkId
              : null,
          result_policy_change_id:
            handlerResult.fkField === 'result_policy_change_id'
              ? handlerResult.fkId
              : null,
          result_innovation_dev_id:
            handlerResult.fkField === 'result_innovation_dev_id'
              ? handlerResult.fkId
              : null,
          other_contribution_narrative:
            handlerResult.fkField === null ? String(dto.narrative ?? '') : null,
          created_by: actorUserId,
          updated_by: actorUserId,
        });

      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: INDICATOR_MAPPING_CHANGED,
        payload_before: this.toMappingHistoryPayload(previousMapping),
        payload_after: this.toMappingHistoryPayload(savedMapping),
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });

    return this.toMappingResponse(
      resultCode,
      savedMapping,
      alignment.selected_levers.find((lever) => lever.lever_code === leverCode)
        ?.lever_name ?? leverCode,
    );
  }

  async deleteContribution(
    resultId: number,
    resultCode: string,
    indicatorCode: string,
    user: User,
    leverCode: string,
  ): Promise<void> {
    const context = await this.getEditableContributionContext(resultId);
    await this.getActiveAlignmentForLever(resultId, leverCode);
    const previousMapping =
      await this.mappingRepository.findActiveMappingByResultLeverIndicator(
        resultId,
        leverCode,
        indicatorCode,
      );

    if (!previousMapping) {
      throw new NotFoundException('Pool funding indicator mapping not found');
    }

    const handler = this.getContributionHandler(previousMapping.indicator_type);
    const actorUserId = user.sec_user_id;
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      await handler.delete({ resultId, resultCode, indicatorCode, manager });
      await manager.getRepository(ResultPoolFundingIndicatorMapping).update(
        { id: previousMapping.id, is_active: true },
        {
          is_active: false,
          deleted_at: now,
          updated_by: actorUserId,
        },
      );
      await manager.getRepository(ResultReviewHistory).save({
        result_id: resultId,
        version_id: context.version_id,
        actor_user_id: actorUserId,
        event_type: INDICATOR_MAPPING_CHANGED,
        payload_before: this.toMappingHistoryPayload(previousMapping),
        payload_after: null,
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    });
  }

  async reviewDecision(
    _resultCode: string,
    _dto: ReviewDecisionDto,
    _user: User,
  ): Promise<void> {
    throw new NotImplementedException(
      'Bilateral review decision is not implemented yet',
    );
  }

  private toBoolean(
    value: boolean | number | string | null | undefined,
  ): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  /**
   * @sdd-spec docs/specs/bilateral-module/pending-items — T-15.1 / R-BIL-070
   *
   * Normalizes input `sp_codes` (or legacy `lever_codes`) and validates each
   * one against the per-result SP list returned by R-BIL-076 (delegated to
   * `getScienceProgramsForResult`). Unknown codes — typos, stale FE bundles,
   * wrong-project picks — produce a 400 with `errors.unknown_sp_codes` so the
   * FE can highlight which inputs failed.
   *
   * Validation skipped when `has_contribution === false` (codes are dropped
   * per the existing R-BIL-014 behavior).
   */
  private async normalizeLeverCodes(
    dto: UpdatePoolFundingAlignmentDto,
    resultId: number,
    resultCode: string,
  ): Promise<string[]> {
    if (!dto.has_contribution) {
      return [];
    }

    // Prefer sp_codes (new) over lever_codes (legacy back-compat).
    const sourceCodes = dto.sp_codes?.length ? dto.sp_codes : dto.lever_codes;
    const codes = Array.from(
      new Set((sourceCodes ?? []).map((code) => code?.trim()).filter(Boolean)),
    );

    if (!codes.length) {
      throw new BadRequestException(
        'At least one Science Program code (sp_codes) is required when has_contribution is true',
      );
    }

    const perResult = await this.getScienceProgramsForResult(
      resultId,
      resultCode,
    );
    const validCodes = new Set(perResult.science_programs.map((sp) => sp.code));
    const unknownCodes = codes.filter((code) => !validCodes.has(code));

    if (unknownCodes.length) {
      // GlobalExceptions surfaces `exception.response.message` into the
      // envelope's `errors` field — packing the structured payload as
      // `message` is how the FE receives `errors.unknown_sp_codes`.
      throw new BadRequestException({
        message: {
          description: 'Unknown Science Program codes',
          unknown_sp_codes: unknownCodes,
        },
      });
    }

    return codes;
  }

  private toHistoryPayload(
    alignment: PoolFundingAlignmentDetail | null,
  ): Record<string, unknown> | null {
    if (!alignment) {
      return null;
    }

    return {
      has_contribution: alignment.has_contribution,
      lever_codes: alignment.selected_levers.map((lever) => lever.lever_code),
    };
  }

  private async getEditableContributionContext(resultId: number) {
    const context =
      await this.resultRepository.findPoolFundingAlignmentContext(resultId);

    if (!context) {
      throw new NotFoundException('Result not found');
    }

    // R-BIL-071: same architectural source gate as updateAlignment — runs
    // first so PRMS-sourced results always return the locked 409 wording.
    this.assertPrmsSourceWritable(context.platform_code);

    if (!this.toBoolean(context.is_pool_funding_contributor)) {
      throw new BadRequestException(
        'Result project is not a Pool Funding Contributor',
      );
    }

    if (this.toBoolean(context.is_synced_to_prms)) {
      throw new ConflictException('Result is already synced to PRMS');
    }

    return context;
  }

  // @sdd-spec docs/specs/bilateral-module/pending-items — T-15.2 / R-BIL-071
  //
  // Architectural gate: PRMS-sourced results are read-only on bilateral
  // surfaces no matter what. Runs BEFORE role/owner checks (RolesGuard
  // bypasses SYSTEM_ADMIN, but this rejects it too — PRMS owns the data).
  // Description wording is locked: the FE keys off it.
  private isPrmsSourced(platformCode: string | null | undefined): boolean {
    return platformCode === 'PRMS';
  }

  private assertPrmsSourceWritable(
    platformCode: string | null | undefined,
  ): void {
    if (this.isPrmsSourced(platformCode)) {
      throw new ConflictException(
        'Result is PRMS-sourced; bilateral alignment is read-only in STAR',
      );
    }
  }

  private async getActiveAlignmentForLever(
    resultId: number,
    leverCode: string,
  ): Promise<PoolFundingAlignmentDetail> {
    if (!leverCode?.trim()) {
      throw new BadRequestException('lever-code query parameter is required');
    }

    const alignment =
      await this.alignmentRepository.findActiveAlignmentByResultId(resultId);

    if (!alignment?.has_contribution) {
      throw new NotFoundException('Pool funding alignment not found');
    }

    if (
      !alignment.selected_levers.some((lever) => lever.lever_code === leverCode)
    ) {
      throw new BadRequestException('Lever code is not selected in alignment');
    }

    return alignment;
  }

  private getContributionHandler(
    indicatorType: string,
  ): BilateralIndicatorTypeHandler {
    const handler = this.contributionHandlers.find(
      (candidate) => candidate.indicatorType === indicatorType,
    );

    if (!handler) {
      throw new BadRequestException(
        `Unsupported indicator type: ${indicatorType ?? 'undefined'}`,
      );
    }

    return handler;
  }

  private get contributionHandlers(): BilateralIndicatorTypeHandler[] {
    return [
      this.capacitySharingHandler,
      this.innovationDevelopmentHandler,
      this.knowledgeProductHandler,
      this.noopHandler,
      this.policyChangeHandler,
    ];
  }

  private toMappingResponse(
    resultCode: string,
    mapping: ResultPoolFundingIndicatorMapping,
    leverName: string,
  ): MappingResponse {
    return {
      result_code: resultCode,
      lever_code: mapping.lever_code,
      lever_name: leverName,
      indicator_code: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }

  private toStaleIndicatorResponse(
    mapping: PoolFundingIndicatorMappingDetail,
  ): IndicatorPanelIndicatorResponse {
    return {
      indicator_code: mapping.indicator_code,
      indicator_name: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      target_description: null,
      is_active: false,
      is_mapped: true,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }

  private matchesIndicatorQuery(
    indicator: IndicatorPanelIndicatorResponse,
    query: ListIndicatorsQueryDto,
  ): boolean {
    if (
      query.indicator_type &&
      indicator.indicator_type !== query.indicator_type
    ) {
      return false;
    }

    if (!query.search?.trim()) {
      return true;
    }

    const search = query.search.trim().toLowerCase();

    return [
      indicator.indicator_code,
      indicator.indicator_name,
      indicator.indicator_type,
    ].some((value) => value.toLowerCase().includes(search));
  }

  private toMappingHistoryPayload(
    mapping: Partial<ResultPoolFundingIndicatorMapping> | null,
  ): Record<string, unknown> | null {
    if (!mapping) {
      return null;
    }

    return {
      lever_code: mapping.lever_code,
      indicator_code: mapping.indicator_code,
      indicator_type: mapping.indicator_type,
      result_capacity_sharing_id: mapping.result_capacity_sharing_id,
      result_knowledge_product_id: mapping.result_knowledge_product_id,
      result_policy_change_id: mapping.result_policy_change_id,
      result_innovation_dev_id: mapping.result_innovation_dev_id,
      other_contribution_narrative: mapping.other_contribution_narrative,
      is_stale: this.toBoolean(mapping.is_stale),
    };
  }
}
