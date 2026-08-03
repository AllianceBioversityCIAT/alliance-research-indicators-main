import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { MainResponse } from '@shared/interfaces/responses.interface';
import {
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
export type MappingMutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

@Injectable({ providedIn: 'root' })
export class BilateralMappingService {
  private readonly api = inject(ApiService);

  // AC-03.3 — on failure return null so the component shows the error state. Never throws.
  async list(query?: BilateralMappingListQuery): Promise<BilateralMappingListPage | null> {
    const res = await this.api.GET_BilateralProjectMappings(query);
    return res?.successfulRequest ? res.data : null;
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

  // Shared mutation-envelope mapper: success → { ok:true, data }; failure →
  // { ok:false, status, message } with the message resolved by extractApiError.
  private toMutationResult(
    res: MainResponse<BilateralProjectMapping> | undefined
  ): MappingMutationResult<BilateralProjectMapping> {
    if (res?.successfulRequest) {
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
  private extractApiError(res: MainResponse<BilateralProjectMapping> | undefined): string {
    return res?.errorDetail?.errors || res?.description || '';
  }
}
