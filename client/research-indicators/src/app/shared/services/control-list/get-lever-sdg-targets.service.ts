import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { LeverSdgTargetApi, LeverSdgTargetOption } from '@shared/interfaces/lever-sdg-target.interface';

@Injectable({ providedIn: 'root' })
export class GetLeverSdgTargetsService {
  private readonly api = inject(ApiService);
  private readonly loadingStore = new Map<number, ReturnType<typeof signal<boolean>>>();
  private readonly listStore = new Map<number, ReturnType<typeof signal<LeverSdgTargetOption[]>>>();

  loading = signal(false);
  list = signal<LeverSdgTargetOption[]>([]);

  isOpenSearch(): boolean {
    return false;
  }

  private coerceLeverId(lever_id?: number | string): number | undefined {
    if (lever_id === '' || lever_id === null || lever_id === undefined) return undefined;
    const n = typeof lever_id === 'string' ? Number(lever_id) : lever_id;
    return Number.isFinite(n) ? n : undefined;
  }

  getList(lever_id?: number | string) {
    const id = this.coerceLeverId(lever_id);
    if (id === undefined) return this.list;
    if (!this.listStore.has(id)) this.listStore.set(id, signal<LeverSdgTargetOption[]>([]));
    return this.listStore.get(id)!;
  }

  getLoading(lever_id?: number | string) {
    const id = this.coerceLeverId(lever_id);
    if (id === undefined) return this.loading;
    if (!this.loadingStore.has(id)) this.loadingStore.set(id, signal<boolean>(false));
    return this.loadingStore.get(id)!;
  }

  private mapRows(data: LeverSdgTargetApi[]): LeverSdgTargetOption[] {
    return (data ?? []).map(row => ({
      ...row,
      sdg_target_id: row.id,
      select_label: [row.sdg_target_code, row.sdg_target].filter(Boolean).join(' — ')
    }));
  }

  async main(lever_id?: number | string) {
    const numericId = this.coerceLeverId(lever_id);
    if (numericId === undefined) {
      this.loading.set(true);
      try {
        this.list.set([]);
      } finally {
        this.loading.set(false);
      }
      return;
    }
    const loadingSig = this.getLoading(numericId);
    const listSig = this.getList(numericId);
    loadingSig.set(true);
    try {
      const res = await this.api.GET_LeverSdgTargets(numericId, true);
      const rows = Array.isArray(res?.data) ? res.data : [];
      listSig.set(this.mapRows(rows));
    } catch {
      listSig.set([]);
    } finally {
      loadingSig.set(false);
    }
  }
}
