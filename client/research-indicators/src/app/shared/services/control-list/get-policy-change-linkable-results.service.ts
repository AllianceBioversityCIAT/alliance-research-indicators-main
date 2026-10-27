import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api.service';
import { Result } from '@shared/interfaces/result/result.interface';

/** Not approved (R-PCIL-001, P-7). */
const RESULT_STATUS_NOT_APPROVED = 7;
/** Deleted (R-PCIL-001, P-7). */
const RESULT_STATUS_DELETED = 8;

function isExcludedResultStatus(statusId: number | undefined): boolean {
  return statusId === RESULT_STATUS_NOT_APPROVED || statusId === RESULT_STATUS_DELETED;
}

@Injectable({ providedIn: 'root' })
export class GetPolicyChangeLinkableResultsService {
  private readonly api = inject(ApiService);
  private readonly loadingStore = new Map<number, ReturnType<typeof signal<boolean>>>();
  private readonly listStore = new Map<number, ReturnType<typeof signal<Result[]>>>();
  private readonly errorStore = new Map<number, ReturnType<typeof signal<boolean>>>();
  private readonly inflight = new Map<number, Promise<void>>();

  loading = signal(false);
  list = signal<Result[]>([]);
  error = signal(false);

  isOpenSearch(): boolean {
    return false;
  }

  getList(indicatorId: number) {
    if (!this.listStore.has(indicatorId)) this.listStore.set(indicatorId, signal<Result[]>([]));
    return this.listStore.get(indicatorId)!;
  }

  getLoading(indicatorId: number) {
    if (!this.loadingStore.has(indicatorId)) this.loadingStore.set(indicatorId, signal<boolean>(false));
    return this.loadingStore.get(indicatorId)!;
  }

  getError(indicatorId: number) {
    if (!this.errorStore.has(indicatorId)) this.errorStore.set(indicatorId, signal<boolean>(false));
    return this.errorStore.get(indicatorId)!;
  }

  /** Loads GET /api/results for one indicator (see ApiService.GET_Results). */
  main(indicatorId: number): Promise<void> {
    const existing = this.inflight.get(indicatorId);
    if (existing) return existing;

    const request = this.load(indicatorId).finally(() => {
      if (this.inflight.get(indicatorId) === request) {
        this.inflight.delete(indicatorId);
      }
    });
    this.inflight.set(indicatorId, request);
    return request;
  }

  private async load(indicatorId: number): Promise<void> {
    const loadingSig = this.getLoading(indicatorId);
    const listSig = this.getList(indicatorId);
    const errorSig = this.getError(indicatorId);
    loadingSig.set(true);
    errorSig.set(false);
    try {
      const res = await this.api.GET_Results({ 'indicator-codes': [indicatorId] });
      if (!res?.successfulRequest) {
        errorSig.set(true);
        listSig.set([]);
        return;
      }
      errorSig.set(false);
      const rows = Array.isArray(res.data?.results) ? res.data.results : [];
      listSig.set(rows.filter(row => !isExcludedResultStatus(row.result_status_id)));
    } catch {
      errorSig.set(true);
      listSig.set([]);
    } finally {
      loadingSig.set(false);
    }
  }
}
