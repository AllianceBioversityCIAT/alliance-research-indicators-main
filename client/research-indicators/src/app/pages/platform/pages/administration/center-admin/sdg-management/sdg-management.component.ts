import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, WritableSignal } from '@angular/core';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import {
  LeverSdgTargetApi,
  LeverSdgTargetMapping,
  LeverSdgTargetOption,
  normalizeLeverSdgTargetMappingList,
  ResultLeverSdgTargetPayload
} from '@shared/interfaces/lever-sdg-target.interface';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { ModalComponent } from '@shared/components/modal/modal.component';
import { ApiService } from '@shared/services/api.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { environment } from '@envs/environment';
import { isPortfolio2026SdgTargetCode } from '@shared/constants/portfolio-2026-sdg-targets';
import { Portfolio } from '@shared/interfaces/portfolio.interface';

interface SdgLeverSignalValue {
  result_lever_sdgs: GetSdgs[];
  result_lever_sdg_targets: ResultLeverSdgTargetPayload[];
}

@Component({
  selector: 'app-sdg-management',
  standalone: true,
  imports: [CommonModule, ButtonModule, MultiselectComponent, ModalComponent],
  templateUrl: './sdg-management.component.html',
  styleUrl: './sdg-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class SdgManagementComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly modals = inject(AllModalsService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly levers = signal<GetLevers[]>([]);
  readonly portfolios = signal<Portfolio[]>([]);
  readonly clarisaSdgTargets = signal<LeverSdgTargetApi[]>([]);
  readonly portfolio2026Targets = signal<LeverSdgTargetApi[]>([]);
  readonly savingLeverId = signal<number | null>(null);
  readonly savingPortfolio2026 = signal(false);
  readonly editingLever = signal<GetLevers | null>(null);
  readonly portfolio2025EditSignal = signal<{ result_lever_sdg_targets: LeverSdgTargetOption[] }>({
    result_lever_sdg_targets: []
  });
  readonly portfolio2026EditSignal = signal<{ result_lever_sdg_targets: LeverSdgTargetOption[] }>({
    result_lever_sdg_targets: []
  });
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly expanded = signal<Record<number, boolean>>({});
  readonly leversGroupExpanded = signal(false);
  readonly sdgListExpanded = signal(false);

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

  /** Seeded portfolios.id. The reporting year is resolved from each portfolio's start_year and end_year. */
  readonly leverPortfolioId = 1;
  readonly sdgListPortfolioId = 2;

  portfolio2025Levers(): GetLevers[] {
    return this.levers().filter(lever => Number(lever.portfolio_id) === this.leverPortfolioId);
  }

  private portfolioById(portfolioId: number): Portfolio | undefined {
    return this.portfolios().find(item => Number(item.id ?? item.portfolio_id) === portfolioId);
  }

  /** Both portfolio sections, most recent first (latest start year, then latest end year). */
  readonly portfolioSections = computed<number[]>(() => {
    const yearsOf = (id: number) => {
      const portfolio = this.portfolioById(id);
      const start = Number(portfolio?.start_year);
      const end = Number(portfolio?.end_year);
      return { start: Number.isFinite(start) ? start : -Infinity, end: Number.isFinite(end) ? end : -Infinity };
    };
    return [this.leverPortfolioId, this.sdgListPortfolioId].sort((a, b) => {
      const ya = yearsOf(a);
      const yb = yearsOf(b);
      return yb.start - ya.start || yb.end - ya.end;
    });
  });

  portfolioLabel(portfolioId: number): string {
    const portfolio = this.portfolioById(portfolioId);
    const start = Number(portfolio?.start_year);
    const end = Number(portfolio?.end_year);
    const hasRange = portfolio != null && Number.isFinite(start) && Number.isFinite(end);
    return hasRange ? `Portfolio (${start}–${end})` : 'Portfolio';
  }

  toggleLeversGroup(): void {
    this.leversGroupExpanded.update(open => !open);
  }

  toggleSdgList(): void {
    this.sdgListExpanded.update(open => !open);
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

  targetsForLever(lever: GetLevers): LeverSdgTargetApi[] {
    const catalog = this.clarisaSdgTargets();
    return this.sdgSignalFor(lever)()
      .result_lever_sdg_targets.map(item => {
        const id = Number(item.sdg_target_id);
        if (!Number.isFinite(id) || id <= 0) return null;
        return (
          catalog.find(row => Number(row.id) === id) ?? {
            id,
            sdg_target_code: String(id),
            sdg_target: ''
          }
        );
      })
      .filter((row): row is LeverSdgTargetApi => row != null)
      .sort((a, b) => String(a.sdg_target_code).localeCompare(String(b.sdg_target_code), undefined, { numeric: true }));
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
      if (typeof this.api.GET_Portfolios === 'function') {
        const portfoliosRes = await this.api.GET_Portfolios().catch(() => null);
        this.portfolios.set(Array.isArray(portfoliosRes?.data) ? portfoliosRes.data : []);
      }

      for (const l of this.levers()) {
        this.ensureSdgSignalForLeverId(this.leverNumericId(l));
      }

      const mappingRows = await this.fetchMappingRows();
      this.applyMappingsToSignals(mappingRows);

      if (typeof this.api.GET_ClarisaSdgTargets === 'function') {
        const clarisa = await this.api.GET_ClarisaSdgTargets().catch(() => null);
        const rows = Array.isArray(clarisa?.data) ? clarisa.data : [];
        this.clarisaSdgTargets.set(rows);
        const allowedCodes = await this.loadPortfolio2026Codes();
        this.portfolio2026Targets.set(
          rows
            .filter(row =>
              allowedCodes ? allowedCodes.has(String(row.sdg_target_code)) : isPortfolio2026SdgTargetCode(row.sdg_target_code)
            )
            .sort((a, b) =>
              String(a.sdg_target_code).localeCompare(String(b.sdg_target_code), undefined, { numeric: true })
            )
        );
      }
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

  openPortfolio2025Editor(lever: GetLevers): void {
    const targets = this.targetsForLever(lever);
    this.editingLever.set(lever);
    this.portfolio2025EditSignal.set({
      result_lever_sdg_targets: targets.map(target => ({
        id: target.id,
        sdg_target_id: target.id,
        sdg_target: target.sdg_target,
        sdg_target_code: target.sdg_target_code,
        clarisa_sdg: target.clarisa_sdg,
        select_label: [target.sdg_target_code, target.sdg_target].filter(Boolean).join(' — ')
      }))
    });
    const leverName = `${lever.short_name ?? ''}${lever.other_names ? ': ' + lever.other_names : ''}`.trim();
    this.modals.modalConfig.update(modals => ({
      ...modals,
      portfolio2025LeverSdgs: {
        ...modals.portfolio2025LeverSdgs,
        title: leverName || 'SDG targets',
        cancelText: 'Cancel',
        confirmText: 'Save',
        confirmAction: () => {
          void this.savePortfolio2025();
        },
        cancelAction: () => this.modals.closeModal('portfolio2025LeverSdgs'),
        disabledConfirmAction: () => this.savingLeverId() !== null
      }
    }));
    this.modals.openModal('portfolio2025LeverSdgs');
  }

  async savePortfolio2025(): Promise<void> {
    const lever = this.editingLever();
    if (!lever || this.savingLeverId() !== null) return;
    const sdg_target_ids = this.portfolio2025EditSignal()
      .result_lever_sdg_targets.map(target => Number(target.sdg_target_id))
      .filter(id => Number.isFinite(id) && id > 0);
    this.sdgSignalFor(lever).set({
      result_lever_sdgs: [],
      result_lever_sdg_targets: sdg_target_ids.map(sdg_target_id => ({ sdg_target_id }))
    });
    await this.saveForLever(lever);
    if (!this.saveError()) {
      this.modals.closeModal('portfolio2025LeverSdgs');
    }
  }

  private async loadPortfolio2026Codes(): Promise<Set<string> | null> {
    if (typeof this.api.GET_Portfolio2026SdgTargets !== 'function') return null;
    const config = await this.api.GET_Portfolio2026SdgTargets().catch(() => null);
    const codes = config?.data?.codes;
    if (!Array.isArray(codes)) return null;
    return new Set(codes.map(code => String(code)));
  }

  openPortfolio2026Editor(): void {
    this.portfolio2026EditSignal.set({
      result_lever_sdg_targets: this.portfolio2026Targets().map(target => ({
        id: target.id,
        sdg_target_id: target.id,
        sdg_target: target.sdg_target,
        sdg_target_code: target.sdg_target_code,
        clarisa_sdg: target.clarisa_sdg,
        select_label: [target.sdg_target_code, target.sdg_target].filter(Boolean).join(' — ')
      }))
    });
    this.modals.modalConfig.update(modals => ({
      ...modals,
      portfolio2026SdgTargets: {
        ...modals.portfolio2026SdgTargets,
        title: 'SDG targets',
        cancelText: 'Cancel',
        confirmText: 'Save',
        confirmAction: () => {
          void this.savePortfolio2026();
        },
        cancelAction: () => this.modals.closeModal('portfolio2026SdgTargets'),
        disabledConfirmAction: () => this.savingPortfolio2026()
      }
    }));
    this.modals.openModal('portfolio2026SdgTargets');
  }

  async savePortfolio2026(): Promise<void> {
    if (this.savingPortfolio2026()) return;
    this.savingPortfolio2026.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      const sdg_target_ids = this.portfolio2026EditSignal()
        .result_lever_sdg_targets.map(target => Number(target.sdg_target_id))
        .filter(id => Number.isFinite(id) && id > 0);
      await this.api.PATCH_Portfolio2026SdgTargets({ sdg_target_ids });
      this.modals.closeModal('portfolio2026SdgTargets');
      this.saveSuccess.set(true);
      await this.load();
    } catch {
      this.saveError.set('Failed to save the SDG targets. Please try again.');
    } finally {
      this.savingPortfolio2026.set(false);
    }
  }
}
