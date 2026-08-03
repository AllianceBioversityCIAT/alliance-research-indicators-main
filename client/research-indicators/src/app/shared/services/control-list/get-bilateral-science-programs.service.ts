import { effect, Injectable, inject, signal } from '@angular/core';
import { BilateralService } from '../bilateral.service';
import { CacheService } from '../cache/cache.service';
import { PoolFundingScienceProgram } from '@interfaces/bilateral/pool-funding-alignment.interface';

/**
 * Picker option shape. Carries the per-result SP fields (`allocation`, `icon_key`
 * for the chip render in AC-01.6) plus `official_code` as the option value, so the
 * alignment form's existing `official_code` contract (dirty-check + PATCH
 * `sp_codes`) stays unchanged (AC-01.7).
 */
export interface BilateralScienceProgramOption extends PoolFundingScienceProgram {
  official_code: string;
}

/**
 * Per-result SP picker source for the Pool Funding Alignment multiselect
 * (REQ-BIL-ASR-01). Bridges the `MultiselectComponent` control-list contract
 * (`list` / `loading` / `main`) to {@link BilateralService}, which owns the
 * authoritative `sciencePrograms` + `mappingStatus` signals. The picker therefore
 * shows only the SPs the result's mapped CLARISA project participates in — NOT
 * the catalog-wide 13-SP list (that stays available via `GET_SciencePrograms`
 * for display-only contexts, AC-01.5).
 *
 * @sdd-spec docs/specs/bilateral-module/alignment-section-remediation
 */
@Injectable({ providedIn: 'root' })
export class GetBilateralScienceProgramsService {
  private readonly bilateralService = inject(BilateralService);
  private readonly cache = inject(CacheService);

  // Writable signal (not computed) so MultiselectComponent can subscribe via the
  // standard control-list `list` contract. Kept in sync with BilateralService.
  readonly list = signal<BilateralScienceProgramOption[]>([]);
  readonly loading = this.bilateralService.loadingSciencePrograms;
  readonly isOpenSearch = signal(false);

  private readonly loadedFor = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.list.set(
        this.bilateralService.sciencePrograms().map(sp => ({ ...sp, official_code: sp.code }))
      );
    });
  }

  // The picker only renders after the alignment loads, so the component already
  // triggers the per-result fetch. Skip a redundant round-trip when the data is
  // present or in flight for this result; otherwise resolve the numeric id from
  // the cache (same source the alignment component uses) and delegate.
  async main(): Promise<void> {
    const numeric = this.cache.getCurrentNumericResultId();
    const resultCode = numeric ? String(numeric) : '';
    if (!resultCode) return;
    if (this.loadedFor() === resultCode && this.bilateralService.mappingStatus() !== null) return;
    this.loadedFor.set(resultCode);
    // Delegates to BilateralService — in-flight requests for the same result are deduped.
    await this.bilateralService.getSciencePrograms(resultCode);
  }

  // Parity with other control-list services consumed by the multiselect's filter
  // hook; the SP picker is not an OpenSearch-backed list, so this is inert.
  update(): void {
    /* no-op — not an OpenSearch list */
  }
}
