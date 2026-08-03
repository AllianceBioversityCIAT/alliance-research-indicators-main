import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { GlobalTarget } from '@shared/interfaces/global-target.interface';

@Injectable({ providedIn: 'root' })
export class GlobalTargetsService {
  apiService = inject(ApiService);
  private readonly defaultList = signal<GlobalTarget[]>([]);
  private readonly defaultLoading = signal(false);
  private readonly listByImpactArea = new Map<number, WritableSignal<GlobalTarget[]>>();
  private readonly loadingByImpactArea = new Map<number, WritableSignal<boolean>>();
  private readonly openSearchSignal = signal(false);

  isOpenSearch(): boolean {
    return this.openSearchSignal();
  }

  async main(impactAreaId?: number) {
    if (typeof impactAreaId !== 'number') {
      return;
    }

    const loadingSig = this.ensureLoadingSignal(impactAreaId);
    loadingSig.set(true);
    try {
      const response = await this.apiService.GET_GlobalTargets(impactAreaId);
      const data = Array.isArray(response?.data) ? response.data : [];
      this.ensureListSignal(impactAreaId).set(data);
    } catch {
      this.ensureListSignal(impactAreaId).set([]);
    } finally {
      loadingSig.set(false);
    }
  }

  getList(impactAreaId?: number): WritableSignal<GlobalTarget[]> {
    if (typeof impactAreaId !== 'number') {
      return this.defaultList;
    }
    return this.ensureListSignal(impactAreaId);
  }

  getLoading(impactAreaId?: number): WritableSignal<boolean> {
    if (typeof impactAreaId !== 'number') {
      return this.defaultLoading;
    }
    return this.ensureLoadingSignal(impactAreaId);
  }

  private ensureListSignal(impactAreaId: number): WritableSignal<GlobalTarget[]> {
    if (!this.listByImpactArea.has(impactAreaId)) {
      this.listByImpactArea.set(impactAreaId, signal<GlobalTarget[]>([]));
    }
    return this.listByImpactArea.get(impactAreaId)!;
  }

  private ensureLoadingSignal(impactAreaId: number): WritableSignal<boolean> {
    if (!this.loadingByImpactArea.has(impactAreaId)) {
      this.loadingByImpactArea.set(impactAreaId, signal<boolean>(false));
    }
    return this.loadingByImpactArea.get(impactAreaId)!;
  }
}
