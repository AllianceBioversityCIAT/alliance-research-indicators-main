import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { LeverSdgTargetApi, LeverSdgTargetOption } from '@shared/interfaces/lever-sdg-target.interface';

@Injectable({ providedIn: 'root' })
export class GetClarisaSdgTargetsService {
  private readonly api = inject(ApiService);
  readonly loading = signal(false);
  readonly list = signal<LeverSdgTargetOption[]>([]);

  isOpenSearch(): boolean {
    return false;
  }

  /** Global Clarisa list; `leverId` matches ControlListServices — reserved for a future per-lever API. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- contract with multiselect / control-list
  getList(_leverId?: number | string) {
    return this.list;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- contract with multiselect / control-list
  getLoading(_leverId?: number | string) {
    return this.loading;
  }

  private mapRows(data: LeverSdgTargetApi[]): LeverSdgTargetOption[] {
    return (data ?? []).map(row => ({
      ...row,
      sdg_target_id: row.id,
      select_label: [row.sdg_target_code, row.sdg_target].filter(Boolean).join(' — ')
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as other control-list `main` calls; global fetch for now
  async main(_leverId?: number | string) {
    this.loading.set(true);
    try {
      const res = await this.api.GET_ClarisaSdgTargets();
      const rows = Array.isArray(res?.data) ? res.data : [];
      this.list.set(this.mapRows(rows));
    } catch {
      this.list.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
