import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { MainResponse } from '@shared/interfaces/responses.interface';
import {
  AutomapperApplyResponse,
  AutomapperCoverage,
  AutomapperPreviewResponse,
  BilateralProjectMapping,
  BilateralMappingListPage,
  BilateralMappingListQuery,
  ClarisaBilateralProjectOption,
  CreateBilateralMappingBody,
  UpdateBilateralMappingBody
} from '@interfaces/bilateral/bilateral-project-mapping.interface';
import { FindContracts } from '@shared/interfaces/find-contracts.interface';

// Discriminated union mirroring BilateralService.PatchTagResult — the component
// branches on `ok` and, on failure, surfaces `message` (already resolved to the
// human-readable text) alongside `status` for 409-vs-400 routing.
// @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (T-BIL-CAM-02)
// @sdd-spec docs/specs/changes/bilateral-mapping-table-enhancements (T-BTE-02 / R-BTE-003)
export type MappingMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

@Injectable({ providedIn: 'root' })
export class BilateralMappingService {
  private readonly api = inject(ApiService);

  // AC-03.3 — on failure return null so the component shows the error state. Never throws.
  async list(query?: BilateralMappingListQuery, phase?: number): Promise<BilateralMappingListPage | null> {
    if (query?.status === 'pending') {
      const preview = await this.previewAutoMap(phase);
      if (!preview) return null;

      const unmappedCandidates = [
        ...(preview.toCreate ?? []),
        ...(preview.ambiguous ?? []),
        ...(preview.unresolved ?? [])
      ];

      const needle = query.search?.trim().toLowerCase();
      const filtered = needle
        ? unmappedCandidates.filter(
            c =>
              c.clarisaProjectShortName?.toLowerCase().includes(needle) ||
              c.clarisaProjectFullName?.toLowerCase().includes(needle) ||
              c.derivedContractId?.toLowerCase().includes(needle)
          )
        : unmappedCandidates;

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      const items: BilateralProjectMapping[] = paginated.map(c => ({
        id: -c.clarisaProjectId,
        agresso_agreement_id: c.derivedContractId || '—',
        agresso_description: null,
        clarisa_project_id: c.clarisaProjectId,
        clarisa_project_short_name: c.clarisaProjectShortName,
        clarisa_project_full_name: c.clarisaProjectFullName,
        source: 'UNMAPPED' as const,
        is_active: true,
        mapping_status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      return {
        items,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.max(1, Math.ceil(total / limit))
        }
      };
    }

    const res = await this.api.GET_BilateralProjectMappings(query);
    if (!res?.successfulRequest || !res.data) return null;

    const items = res.data.items.map(item => ({
      ...item,
      mapping_status: item.mapping_status ?? (item.is_active ? 'Mapped' : 'Inactive')
    }));

    return {
      items,
      meta: res.data.meta
    };
  }

  async get(id: number): Promise<BilateralProjectMapping | null> {
    const res = await this.api.GET_BilateralProjectMapping(id);
    return res?.successfulRequest ? res.data : null;
  }

  async create(body: CreateBilateralMappingBody): Promise<MappingMutationResult<BilateralProjectMapping>> {
    const res = await this.api.POST_BilateralProjectMapping(body);
    return this.toMutationResult(res);
  }

  async update(id: number, body: UpdateBilateralMappingBody): Promise<MappingMutationResult<BilateralProjectMapping>> {
    const res = await this.api.PATCH_BilateralProjectMapping(id, body);
    return this.toMutationResult(res);
  }

  // AC-07.3 — idempotent server-side; same result shape as create/update.
  async deactivate(id: number): Promise<MappingMutationResult<BilateralProjectMapping>> {
    const res = await this.api.PATCH_BilateralProjectMappingDeactivate(id);
    return this.toMutationResult(res);
  }

  // AGRESSO picker — lazy server-side search over BILATERAL (non-pooled) contracts.
  // Uses `query` (broad LIKE across agreement_id + description + project_lead_description)
  // instead of `contract-code` (code-only) so results are more relevant. `limit` caps
  // the result set to avoid rendering thousands of option nodes.
  // NOTE: must NOT filter by `pool-funding-contributor` — mapping is what should
  // *make* a project a pool-funding contributor, so that flag would hide the very
  // contracts an operator needs to map. `exclude-pooled-funding` yields bilaterals.
  // @sdd-spec docs/specs/bilateral-module/center-admin-project-mapping (lazy-picker perf)
  async loadAgressoOptions(search?: string, limit = 50): Promise<{ agreement_id: string; description: string }[]> {
    const res = await this.api.GET_FindContracts({
      'exclude-pooled-funding': true,
      ...(search ? { query: search } : {}),
      limit
    });
    if (!res?.successfulRequest) return [];
    const rows: FindContracts[] = res.data?.data ?? [];
    return rows
      .filter((row): row is FindContracts & { agreement_id: string } => !!row.agreement_id)
      .map(row => ({
        agreement_id: row.agreement_id,
        description: row.description ?? row.projectDescription ?? ''
      }));
  }

  // CLARISA project picker (AC-05.6) — server-scoped to bilateral projects. On
  // failure returns [].
  async loadClarisaProjectOptions(search?: string): Promise<ClarisaBilateralProjectOption[]> {
    const res = await this.api.GET_ClarisaBilateralProjects(search);
    return res?.successfulRequest ? (res.data ?? []) : [];
  }

  // ── Automapper endpoints (S2 — T-06) ──────────────────────────────────────

  /**
   * Fetches coverage metrics: mapped / pending / reachable against eligible CLARISA cohort.
   * On failure returns null so the component can render the error state without crashing.
   */
  async getCoverage(phase?: number): Promise<AutomapperCoverage | null> {
    const res = await this.api.GET_BilateralMappingCoverage(phase);
    return res?.successfulRequest && res.data ? res.data : null;
  }

  /**
   * Generates a preview of the automapper run without writing any rows.
   * On failure returns null.
   */
  async previewAutoMap(phase?: number): Promise<AutomapperPreviewResponse | null> {
    const res = await this.api.POST_AutomapperPreview(phase !== undefined ? { phase } : undefined);
    return res?.successfulRequest && res.data ? res.data : null;
  }

  /**
   * Applies the automapper run server-side.
   */
  async applyAutoMap(phase?: number): Promise<MappingMutationResult<AutomapperApplyResponse>> {
    const res = await this.api.POST_AutomapperApply(phase !== undefined ? { phase } : undefined);
    return this.toMutationResult<AutomapperApplyResponse>(res);
  }

  // Shared mutation-envelope mapper: success → { ok:true, data }; failure →
  // { ok:false, status, message } with the message resolved by extractApiError.
  private toMutationResult<T>(
    res: MainResponse<T> | undefined
  ): MappingMutationResult<T> {
    if (res?.successfulRequest && res.data !== undefined) {
      return { ok: true, data: res.data };
    }
    return {
      ok: false,
      status: res?.status ?? 0,
      message: this.extractApiError(res)
    };
  }

  // Error-message extraction (design §6, backend-confirmed): the readable text lives
  // in `errorDetail.errors` (e.g. "Active mapping already exists for this contract").
  // `errorDetail.description` is the exception class name ("ConflictException") and
  // must NOT be preferred. Order: errorDetail.errors → top-level description → ''.
  private extractApiError(res: MainResponse<unknown> | undefined): string {
    return res?.errorDetail?.errors || res?.description || '';
  }
}
