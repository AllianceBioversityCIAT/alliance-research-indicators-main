import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, WritableSignal } from '@angular/core';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import {
  LeverSdgTargetMapping,
  normalizeLeverSdgTargetMappingList,
  ResultLeverSdgTargetPayload
} from '@shared/interfaces/lever-sdg-target.interface';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { ApiService } from '@shared/services/api.service';
import { environment } from '@envs/environment';

interface SdgLeverSignalValue {
  result_lever_sdgs: GetSdgs[];
  result_lever_sdg_targets: ResultLeverSdgTargetPayload[];
}

@Component({
  selector: 'app-sdg-management',
  standalone: true,
  imports: [CommonModule, MultiselectComponent],
  templateUrl: './sdg-management.component.html',
  styleUrl: './sdg-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class SdgManagementComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly levers = signal<GetLevers[]>([]);
  readonly savingLeverId = signal<number | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly expanded = signal<Record<number, boolean>>({});

  private readonly leverSdgSignals = new Map<number, WritableSignal<SdgLeverSignalValue>>();
  private readonly mappingIdByPair = new Map<string, number>();

  readonly allowRemoveSdg = (): boolean => true;
  readonly selectedItemsSurfaceColor = '#F4F7F9';

  ngOnInit(): void {
    void this.load();
  }

  leverNumericId(lever: GetLevers): number {
    return Number(lever.lever_id ?? lever.id);
  }

  leverImageSrc(lever: GetLevers): string {
    const raw = lever.icon ?? lever.lever_url;
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalized = raw.startsWith('/') ? raw.slice(1) : raw;
    return environment.s3Folder + normalized;
  }

  isExpanded(lever: GetLevers): boolean {
    return this.expanded()[this.leverNumericId(lever)] ?? false;
  }

  toggleRow(lever: GetLevers): void {
    const id = this.leverNumericId(lever);
    this.expanded.update(p => ({ ...p, [id]: !p[id] }));
  }

  sdgSignalFor(lever: GetLevers): WritableSignal<SdgLeverSignalValue> {
    const id = this.leverNumericId(lever);
    const existing = this.leverSdgSignals.get(id);
    if (existing) {
      return existing;
    }
    const created = signal<SdgLeverSignalValue>({ result_lever_sdgs: [], result_lever_sdg_targets: [] });
    this.leverSdgSignals.set(id, created);
    return created;
  }

  private ensureSdgSignalForLeverId(leverId: number): void {
    if (!this.leverSdgSignals.has(leverId)) {
      this.leverSdgSignals.set(leverId, signal<SdgLeverSignalValue>({ result_lever_sdgs: [], result_lever_sdg_targets: [] }));
    }
  }

  private async fetchMappingRows(): Promise<LeverSdgTargetMapping[]> {
    const allRes = await this.api.GET_LeverSdgTargetMappings().catch(() => null);
    if (allRes?.data && Array.isArray(allRes.data) && allRes.data.length > 0) {
      return normalizeLeverSdgTargetMappingList(allRes.data);
    }
    const out: LeverSdgTargetMapping[] = [];
    for (const lever of this.levers()) {
      const lid = this.leverNumericId(lever);
      const r = await this.api.GET_LeverSdgTargets(lid, false);
      const part = normalizeLeverSdgTargetMappingList(r?.data);
      for (const row of part) {
        out.push({
          ...row,
          lever_id: row.lever_id > 0 ? row.lever_id : lid
        });
      }
    }
    return out;
  }

  private applyMappingsToSignals(mappingRows: LeverSdgTargetMapping[]): void {
    for (const row of mappingRows) {
      this.mappingIdByPair.set(`${row.lever_id}-${row.sdg_target_id}`, row.id);
    }
    const byLever = new Map<number, ResultLeverSdgTargetPayload[]>();
    for (const row of mappingRows) {
      const next = byLever.get(row.lever_id) ?? [];
      next.push({ sdg_target_id: row.sdg_target_id });
      byLever.set(row.lever_id, next);
    }
    for (const lever of this.levers()) {
      const lid = this.leverNumericId(lever);
      this.leverSdgSignals.get(lid)?.set({ result_lever_sdgs: [], result_lever_sdg_targets: byLever.get(lid) ?? [] });
    }
  }

  private buildFullPatchList(): { id: number; lever_id: number; sdg_target_id: number }[] {
    const leverSdgTargetList: { id: number; lever_id: number; sdg_target_id: number }[] = [];
    for (const lever of this.levers()) {
      const lid = this.leverNumericId(lever);
      const sig = this.leverSdgSignals.get(lid);
      if (!sig) continue;
      for (const t of sig().result_lever_sdg_targets) {
        const stid = t.sdg_target_id;
        if (stid == null || Number.isNaN(Number(stid))) continue;
        const key = `${lid}-${stid}`;
        leverSdgTargetList.push({
          id: this.mappingIdByPair.get(key) ?? 0,
          lever_id: lid,
          sdg_target_id: Number(stid)
        });
      }
    }
    return leverSdgTargetList;
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    this.saveError.set(null);
    this.mappingIdByPair.clear();
    this.leverSdgSignals.clear();

    try {
      const leversRes = await this.api.GET_Levers();
      const list = leversRes?.data ?? [];
      this.levers.set([...list].sort((a, b) => (a.short_name || '').localeCompare(b.short_name || '')));

      for (const l of this.levers()) {
        this.ensureSdgSignalForLeverId(this.leverNumericId(l));
      }

      const mappingRows = await this.fetchMappingRows();
      this.applyMappingsToSignals(mappingRows);
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async saveForLever(lever: GetLevers): Promise<void> {
    if (this.loading() || this.loadError()) return;
    const id = this.leverNumericId(lever);
    this.savingLeverId.set(id);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await this.api.PATCH_LeverSdgTargets({ leverSdgTargetList: this.buildFullPatchList() });
      this.saveSuccess.set(true);
      await this.load();
    } catch {
      this.saveError.set('Failed to save. Please try again.');
    } finally {
      this.savingLeverId.set(null);
    }
  }
}
