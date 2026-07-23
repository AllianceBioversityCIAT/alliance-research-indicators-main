import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AgressoContractRow, PoolFundingTagPatchResponse } from '@interfaces/bilateral/agresso-contract.interface';
import {
  AlignmentResponse,
  BilateralTocCatalogResponse,
  PoolFundingMappingStatus,
  PoolFundingScienceProgram,
  SavedTocAlignment,
  SpAlignmentDraft,
  TocAlignmentWriteDto,
  TocCatalogSp,
  UpdatePoolFundingAlignmentDto
} from '@interfaces/bilateral/pool-funding-alignment.interface';
import { RolesService } from './cache/roles.service';
import { CurrentResultService } from './cache/current-result.service';
import { ErrorResponse } from '@shared/interfaces/responses.interface';
import { hasActivePooledFundingContract, isBilateralFundingType } from '@shared/constants/agresso-funding.constants';

export type PatchTagResult =
  | { ok: true; data: PoolFundingTagPatchResponse }
  | { ok: false; status: number; description: string };

// Per-alignment 400 validation entry (400 `errors.toc_alignments: [{ sp_code,
// field?, message }]`) — routed by the page to the owning SP block (AC-08.2).
// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 (T-BIL-TM2-02)
export interface TocAlignmentError {
  sp_code: string;
  field?: string;
  message: string;
}

export type PatchAlignmentResult =
  | { ok: true; data: AlignmentResponse }
  | {
      ok: false;
      status: number;
      description: string;
      fieldErrors?: Record<string, string>;
      // REQ-BIL-ASR-03 — SP codes the backend rejected because they aren't in the
      // result's per-result list (400 `errors.unknown_sp_codes: string[]`). Carried
      // separately from the string-valued `fieldErrors` so the component can both
      // surface an inline message and highlight the offending chips.
      unknownSpCodes?: string[];
      // AC-08.2 — per-SP ToC alignment validation errors, carried separately so the
      // page can render them inline on the matching block instead of a global toast.
      tocAlignmentErrors?: TocAlignmentError[];
    };

@Injectable({ providedIn: 'root' })
export class BilateralService {
  private readonly api = inject(ApiService);
  private readonly rolesService = inject(RolesService);
  private readonly currentResultService = inject(CurrentResultService);

  readonly currentContract = signal<AgressoContractRow | null>(null);
  readonly loadingContract = signal(false);
  readonly savingTag = signal(false);

  readonly currentAlignment = signal<AlignmentResponse | null>(null);
  readonly loadingAlignment = signal(false);
  readonly savingAlignment = signal(false);

  // Per-result SP picker source (REQ-BIL-ASR-01). `mappingStatus` discriminates the
  // empty states: `unmapped` → contact-ops message; `mapped` + empty list → no-SPs
  // message. Defaults to null so the picker shows neither message until loaded.
  readonly sciencePrograms = signal<PoolFundingScienceProgram[]>([]);
  readonly mappingStatus = signal<PoolFundingMappingStatus | null>(null);
  readonly loadingSciencePrograms = signal(false);
  private scienceProgramsInflight = new Map<string, Promise<PoolFundingScienceProgram[]>>();
  private scienceProgramsRequestSeq = 0;

  readonly editable = computed(() => {
    const alignment = this.currentAlignment();
    if (!alignment) return false;
    if (alignment.is_read_only) return false;
    if (this.rolesService.canAccessCenterAdmin()) return true;
    return this.currentResultService.isCurrentUserOwner();
  });

  // --- ToC mapping v2 catalog state (T-BIL-TM2-02) -----------------------------
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2
  // Reshaped per-result ToC catalog (SP → level → ToC result → indicator). Null
  // until first successful fetch; on a non-2xx the prior value is KEPT and only
  // `tocCatalogError` flips, so already-rendered blocks stay usable while the
  // block-level retry affordance is shown (design §4.4, AC-11.1/AC-11.2).
  readonly tocCatalog = signal<BilateralTocCatalogResponse | null>(null);
  readonly loadingTocCatalog = signal(false);
  readonly tocCatalogError = signal(false);
  private tocCatalogInflight = new Map<string, Promise<BilateralTocCatalogResponse | null>>();
  private tocCatalogRequestSeq = 0;

  async getContract(code: string): Promise<AgressoContractRow | null> {
    this.loadingContract.set(true);
    try {
      const res = await this.api.GET_FindContracts({ 'contract-code': code, limit: 1 });
      if (!res?.successfulRequest) {
        this.currentContract.set(null);
        return null;
      }
      const row = res.data?.data?.[0] ?? null;
      this.currentContract.set(row);
      return row;
    } finally {
      this.loadingContract.set(false);
    }
  }

  async patchTag(code: string, value: boolean): Promise<PatchTagResult> {
    this.savingTag.set(true);
    try {
      const res = await this.api.PATCH_PoolFundingTag(code, { is_pool_funding_contributor: value });
      if (res?.successfulRequest) {
        this.currentContract.update(c => (c ? { ...c, is_pool_funding_contributor: value } : c));
        return { ok: true, data: res.data };
      }
      return {
        ok: false,
        status: res?.status ?? 0,
        description: res?.errorDetail?.description ?? ''
      };
    } finally {
      this.savingTag.set(false);
    }
  }

  isBilateral(contract: AgressoContractRow | null | undefined): boolean {
    if (!contract) return false;
    if (!isBilateralFundingType(contract.funding_type)) return false;
    // Parity with backend isBilateralTagTarget — reject when pooled-funding rows are active.
    return !hasActivePooledFundingContract(contract);
  }

  async getAlignment(resultCode: string): Promise<AlignmentResponse | null> {
    this.loadingAlignment.set(true);
    try {
      const res = await this.api.GET_PoolFundingAlignment(resultCode);
      if (!res?.successfulRequest) {
        this.currentAlignment.set(null);
        return null;
      }
      this.currentAlignment.set(res.data);
      return res.data;
    } finally {
      this.loadingAlignment.set(false);
    }
  }

  async getSciencePrograms(resultCode: string): Promise<PoolFundingScienceProgram[]> {
    const key = resultCode.replace(/^STAR-/i, '');
    const inflight = this.scienceProgramsInflight.get(key);
    if (inflight) return inflight;

    const requestSeq = ++this.scienceProgramsRequestSeq;
    const promise = this.fetchSciencePrograms(resultCode, requestSeq).finally(() => {
      if (this.scienceProgramsInflight.get(key) === promise) {
        this.scienceProgramsInflight.delete(key);
      }
    });
    this.scienceProgramsInflight.set(key, promise);
    return promise;
  }

  private async fetchSciencePrograms(
    resultCode: string,
    requestSeq: number
  ): Promise<PoolFundingScienceProgram[]> {
    this.loadingSciencePrograms.set(true);
    try {
      const res = await this.api.GET_PoolFundingSciencePrograms(resultCode);
      if (requestSeq !== this.scienceProgramsRequestSeq) {
        return this.sciencePrograms();
      }
      if (!res?.successfulRequest) {
        // No fallback to the 13-SP catalog (REQ-BIL-ASR-01 pitfall 1): on failure
        // leave the list empty and the status null so the picker stays empty.
        this.sciencePrograms.set([]);
        this.mappingStatus.set(null);
        return [];
      }
      const data = res.data;
      const programs = Array.isArray(data?.science_programs) ? data.science_programs : [];
      this.sciencePrograms.set(programs);
      this.mappingStatus.set(data?.mapping_status ?? null);
      return programs;
    } finally {
      if (requestSeq === this.scienceProgramsRequestSeq) {
        this.loadingSciencePrograms.set(false);
      }
    }
  }

  async patchAlignment(resultCode: string, body: UpdatePoolFundingAlignmentDto): Promise<PatchAlignmentResult> {
    this.savingAlignment.set(true);
    try {
      const res = await this.api.PATCH_PoolFundingAlignment(resultCode, body);
      if (res?.successfulRequest) {
        this.currentAlignment.set(res.data);
        return { ok: true, data: res.data };
      }
      const fieldErrors = this.extractFieldErrors(res?.errorDetail);
      const unknownSpCodes = this.extractUnknownSpCodes(res?.errorDetail);
      const tocAlignmentErrors = this.extractTocAlignmentErrors(res?.errorDetail);
      return {
        ok: false,
        status: res?.status ?? 0,
        description: res?.errorDetail?.description ?? '',
        ...(fieldErrors ? { fieldErrors } : {}),
        ...(unknownSpCodes ? { unknownSpCodes } : {}),
        ...(tocAlignmentErrors ? { tocAlignmentErrors } : {})
      };
    } finally {
      this.savingAlignment.set(false);
    }
  }

  // REQ-BIL-ASR-03 — pull `unknown_sp_codes: string[]` out of the 400 envelope.
  // The shipped `extractFieldErrors` can't (it parses only stringified-JSON and keeps
  // only string-valued entries, dropping arrays), so this is a separate, tolerant
  // extractor. It accepts `errorDetail.errors` as EITHER a stringified-JSON string
  // OR an already-parsed object (the typed shape is `string`, but the live envelope
  // shape is being confirmed — see spec LIVE-VERIFY), and keeps only string entries
  // of the `unknown_sp_codes` array.
  private extractUnknownSpCodes(errorDetail: ErrorResponse | undefined): string[] | undefined {
    const raw: unknown = errorDetail?.errors;
    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('{')) return undefined;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const value = (parsed as Record<string, unknown>)['unknown_sp_codes'];
    if (!Array.isArray(value)) return undefined;
    const codes = value.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
    return codes.length > 0 ? codes : undefined;
  }

  // AC-08.2 — pull `toc_alignments: [{ sp_code, field?, message }]` out of the 400
  // envelope. Tolerant like `extractUnknownSpCodes` above: accepts `errorDetail.errors`
  // as EITHER a stringified-JSON string OR an already-parsed object, and keeps only
  // well-formed entries (non-empty string `sp_code` + string `message`; `field` only
  // when it's a string). Malformed payloads → undefined, never a throw.
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 (T-BIL-TM2-02)
  private extractTocAlignmentErrors(errorDetail: ErrorResponse | undefined): TocAlignmentError[] | undefined {
    const raw: unknown = errorDetail?.errors;
    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('{')) return undefined;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        return undefined;
      }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
    const value = (parsed as Record<string, unknown>)['toc_alignments'];
    if (!Array.isArray(value)) return undefined;
    const entries: TocAlignmentError[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const spCode = record['sp_code'];
      const message = record['message'];
      if (typeof spCode !== 'string' || spCode.trim().length === 0) continue;
      if (typeof message !== 'string') continue;
      const field = record['field'];
      entries.push({ sp_code: spCode, message, ...(typeof field === 'string' ? { field } : {}) });
    }
    return entries.length > 0 ? entries : undefined;
  }

  private extractFieldErrors(errorDetail: ErrorResponse | undefined): Record<string, string> | undefined {
    const raw = errorDetail?.errors;
    if (typeof raw !== 'string' || !raw.trim().startsWith('{')) return undefined;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'string') result[k] = v;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  }

  // --- ToC mapping v2 catalog read + draft seams (T-BIL-TM2-02) ----------------
  // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2

  // Reshaped per-result ToC catalog read (mirrors getAlignment's loading/error
  // discipline). Keep-prior-value-on-error (design §4.4): a non-2xx flips only
  // `tocCatalogError`; a later success clears it. `loadingTocCatalog` is managed
  // in try/finally so the AC-11.1/AC-11.2 state machine never sticks on loading.
  async getTocCatalog(resultCode: string): Promise<BilateralTocCatalogResponse | null> {
    const key = resultCode.replace(/^STAR-/i, '');
    const inflight = this.tocCatalogInflight.get(key);
    if (inflight) return inflight;

    const requestSeq = ++this.tocCatalogRequestSeq;
    const promise = this.fetchTocCatalog(resultCode, requestSeq).finally(() => {
      if (this.tocCatalogInflight.get(key) === promise) {
        this.tocCatalogInflight.delete(key);
      }
    });
    this.tocCatalogInflight.set(key, promise);
    return promise;
  }

  private async fetchTocCatalog(
    resultCode: string,
    requestSeq: number
  ): Promise<BilateralTocCatalogResponse | null> {
    this.loadingTocCatalog.set(true);
    try {
      const res = await this.api.GET_PoolFundingHlosIndicators(resultCode);
      if (requestSeq !== this.tocCatalogRequestSeq) {
        return this.tocCatalog();
      }
      if (!res?.successfulRequest) {
        this.tocCatalogError.set(true);
        return null;
      }
      this.tocCatalog.set(res.data);
      this.tocCatalogError.set(false);
      return res.data;
    } finally {
      if (requestSeq === this.tocCatalogRequestSeq) {
        this.loadingTocCatalog.set(false);
      }
    }
  }

  // Pure lookup of one SP's catalog branch — no signal side effects.
  catalogForSp(spCode: string): TocCatalogSp | null {
    return this.tocCatalog()?.catalogs?.find(c => c.sp_code === spCode) ?? null;
  }

  // Pre-fill seam (REQ-BIL-TM2-08): map saved alignments to per-SP drafts.
  // Missing optional cascade fields become explicit nulls (the draft's "unset").
  draftsFromSaved(saved: SavedTocAlignment[] | undefined | null): SpAlignmentDraft[] {
    return (saved ?? []).map(s => ({
      sp_code: s.sp_code,
      aligns_with_toc: s.aligns_with_toc,
      level: s.level ?? null,
      toc_result_id: s.toc_result_id ?? null,
      indicator_id: s.indicator_id ?? null,
      quantitative_contribution: s.quantitative_contribution ?? null
    }));
  }

  // Save seam (design §4.4 + D-9): `aligns_with_toc === false` → bare No DTO (no
  // cascade fields); complete Yes → full DTO; unanswered (`null`) or incomplete
  // Yes drafts are omitted entirely — defensive only, `canSave` gates completeness
  // upstream (T-BIL-TM2-04).
  writeDtoFromDrafts(drafts: SpAlignmentDraft[]): TocAlignmentWriteDto[] {
    const dtos: TocAlignmentWriteDto[] = [];
    for (const draft of drafts) {
      if (draft.aligns_with_toc === false) {
        dtos.push({ sp_code: draft.sp_code, aligns_with_toc: false });
        continue;
      }
      if (draft.aligns_with_toc !== true) continue; // unanswered → omitted
      if (
        draft.level === null ||
        draft.toc_result_id === null ||
        draft.indicator_id === null ||
        draft.quantitative_contribution === null ||
        draft.quantitative_contribution < 0
      ) {
        continue; // incomplete Yes → omitted (D-9)
      }
      dtos.push({
        sp_code: draft.sp_code,
        aligns_with_toc: true,
        level: draft.level,
        toc_result_id: draft.toc_result_id,
        indicator_id: draft.indicator_id,
        quantitative_contribution: draft.quantitative_contribution
      });
    }
    return dtos;
  }

}
