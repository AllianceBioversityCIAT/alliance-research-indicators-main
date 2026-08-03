import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { LeverStrategicOutcome } from '@shared/interfaces/oicr-creation.interface';

@Injectable({ providedIn: 'root' })
export class GetLeverStrategicOutcomesService {
  private readonly api = inject(ApiService);
  private readonly loadingStore = new Map<number, ReturnType<typeof signal<boolean>>>();
  private readonly listStore = new Map<number, ReturnType<typeof signal<LeverStrategicOutcome[]>>>();

  loading = signal(false);
  list = signal<LeverStrategicOutcome[]>([]);

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
    if (!this.listStore.has(id)) this.listStore.set(id, signal<LeverStrategicOutcome[]>([]));
    return this.listStore.get(id)!;
  }

  getLoading(lever_id?: number | string) {
    const id = this.coerceLeverId(lever_id);
    if (id === undefined) return this.loading;
    if (!this.loadingStore.has(id)) this.loadingStore.set(id, signal<boolean>(false));
    return this.loadingStore.get(id)!;
  }

  /** Loads GET lever-strategic-outcome/by-lever/{lever_id} (see ApiService.GET_LeverStrategicOutcomes). */
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
      const res = await this.api.GET_LeverStrategicOutcomes(numericId);
      listSig.set(Array.isArray(res?.data) ? res.data : []);
    } catch {
      listSig.set([]);
    } finally {
      loadingSig.set(false);
    }
  }
}


