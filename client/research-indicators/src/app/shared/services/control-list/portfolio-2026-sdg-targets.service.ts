import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { LeverSdgTargetApi, LeverSdgTargetOption } from '@shared/interfaces/lever-sdg-target.interface';
import { isPortfolio2026SdgTargetCode } from '@shared/constants/portfolio-2026-sdg-targets';

@Injectable({ providedIn: 'root' })
export class Portfolio2026SdgTargetsService {
  private readonly api = inject(ApiService);
  readonly loading = signal(false);
  readonly list = signal<LeverSdgTargetOption[]>([]);

  isOpenSearch(): boolean {
    return false;
  }

  getList() {
    return this.list;
  }

  getLoading() {
    return this.loading;
  }

  async main() {
    this.loading.set(true);
    try {
      const res = await this.api.GET_ClarisaSdgTargets();
      const rows = Array.isArray(res?.data) ? res.data : [];
      this.list.set(
        rows
          .filter(row => isPortfolio2026SdgTargetCode(row.sdg_target_code))
          .map(row => this.mapRow(row))
          .sort((a, b) => a.sdg_target_code.localeCompare(b.sdg_target_code, undefined, { numeric: true }))
      );
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private mapRow(row: LeverSdgTargetApi): LeverSdgTargetOption {
    return {
      ...row,
      sdg_target_id: row.id,
      select_label: [row.sdg_target_code, row.sdg_target].filter(Boolean).join(' — ')
    };
  }
}
