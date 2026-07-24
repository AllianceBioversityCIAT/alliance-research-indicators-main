import { Component, computed, effect, ElementRef, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import { GetContractsService } from '@services/control-list/get-contracts.service';
import { GetLeversService } from '@services/control-list/get-levers.service';
import { GetStrategicObjectivesService } from '@services/control-list/get-strategic-objectives.service';
import { GetImpactOutcomesService } from '@services/control-list/get-impact-outcomes.service';
import { GetSdgsService } from '@services/control-list/get-sdgs.service';
import { GetLeverSdgTargetsService } from '@services/control-list/get-lever-sdg-targets.service';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../shared/services/api.service';
import { MultiSelectModule } from 'primeng/multiselect';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { GetAllianceAlignment } from '../../../../../../shared/interfaces/get-alliance-alignment.interface';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../../../../environments/environment';
import { SubmissionService } from '@shared/services/submission.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { TooltipModule } from 'primeng/tooltip';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { Lever, LeverStrategicOutcome } from '@shared/interfaces/oicr-creation.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import { ResultLeverSdgTargetPayload } from '@shared/interfaces/lever-sdg-target.interface';
import { AllianceLeverCardComponent } from './components/alliance-lever-card/alliance-lever-card.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { AllianceAlignmentP2Component } from './portfolio/alliance-alignment-p2.component';
import {
  AlignmentSdgTargetRow,
  buildPortfolio2AlignmentPatch,
  enrichAlignmentLevers,
  enrichAlignmentSdgTargets,
  enrichPortfolio2Contracts,
  enrichResultSdgs,
  normalizePortfolio2AlignmentGet
} from './portfolio/portfolio-2-alignment.mapper';

const OTHER_LEVER_ID = 9;
const PORTFOLIO_P2_ID = 2;

@Component({
  selector: 'app-alliance-alignment',
  imports: [
    MultiSelectModule,
    FormHeaderComponent,
    FormsModule,
    MultiselectComponent,
    NavigationButtonsComponent,
    DatePipe,
    TooltipModule,
    AllianceLeverCardComponent,
    InputComponent,
    AllianceAlignmentP2Component
  ],
  templateUrl: './alliance-alignment.component.html'
})
export default class AllianceAlignmentComponent {
  environment = environment;
  getContractsService = inject(GetContractsService);
  getLeversService = inject(GetLeversService);
  getStrategicObjectivesService = inject(GetStrategicObjectivesService);
  getImpactOutcomesService = inject(GetImpactOutcomesService);
  getSdgsService = inject(GetSdgsService);
  getLeverSdgTargetsService = inject(GetLeverSdgTargetsService);
  body: WritableSignal<GetAllianceAlignment> = signal({
    contracts: [],
    result_sdgs: [],
    primary_levers: [],
    contributor_levers: [],
    research_areas: [],
    strategic_objectives: [],
    impact_outcomes: []
  });
  apiService = inject(ApiService);
  cache = inject(CacheService);
  actions = inject(ActionsService);
  router = inject(Router);
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);
  getContractStatusClasses = getContractStatusClasses;

  @ViewChild('containerRef') containerRef!: ElementRef;
  containerWidth = 0;

  private readonly leverOutcomeSignals = new Map<string | number, WritableSignal<{ result_lever_strategic_outcomes: LeverStrategicOutcome[] }>>();
  private readonly leverSdgSignals = new Map<
    string | number,
    WritableSignal<{
      result_lever_sdgs: GetSdgs[];
      result_lever_sdg_targets: AlignmentSdgTargetRow[];
    }>
  >();
  private readonly leverCustomNameSignals = new Map<string | number, WritableSignal<{ custom_lever_name: string }>>();

  contractServiceParams = computed(() => {
    const indicatorId = this.cache.currentMetadata()?.indicator_id;
    return {
      'exclude-pooled-funding': indicatorId !== 5
    };
  });
  isOicrIndicator = computed(() => this.cache.currentMetadata()?.indicator_id === 5);
  isPolicyChangeIndicator = computed(() => this.cache.currentMetadata()?.indicator_id === 4);
  isPortfolioP2Alignment = computed(() => this.getCurrentPortfolioId() === PORTFOLIO_P2_ID);
  alignmentRequestParams = computed(() => {
    const portfolioId = this.getCurrentPortfolioId();
    return portfolioId != null ? { portfolioId, return: true as const } : { return: true as const };
  });
  leverServiceParams = computed(() => ({
    portfolioId: this.getCurrentPortfolioId()
  }));

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }

  async getData() {
    this.leverOutcomeSignals.clear();
    this.leverSdgSignals.clear();

    const portfolioParams = this.leverServiceParams();
    const contractParams = this.contractServiceParams();

    const [response] = await Promise.all([
      this.apiService.GET_Alignments(this.cache.getCurrentNumericResultId(), this.alignmentRequestParams()),
      this.getContractsService.main(contractParams),
      this.getLeversService.main(portfolioParams),
      this.getSdgsService.main()
    ]);

    if (this.isPortfolioP2Alignment()) {
      await Promise.all([
        this.getStrategicObjectivesService.main(portfolioParams),
        this.getImpactOutcomesService.main(portfolioParams),
        ...(this.isOicrIndicator() ? [] : [this.getSdgsService.main()])
      ]);

      const normalized = normalizePortfolio2AlignmentGet(response.data, {
        contracts: this.getContractsService.getList(contractParams)(),
        levers: this.getLeversService.getList(portfolioParams)(),
        strategicObjectives: this.getStrategicObjectivesService.getList(portfolioParams)(),
        impactOutcomes: this.getImpactOutcomesService.getList(portfolioParams)(),
        sdgs: this.getSdgsService.list()
      });
      this.body.set({
        ...normalized,
        result_sdgs: this.isOicrIndicator() ? [] : normalized.result_sdgs
      });
      return;
    }

    const leversCatalog = this.getLeversService.getList(portfolioParams)();
    const contractsCatalog = this.getContractsService.getList(contractParams)();
    const sdgsCatalog = this.getSdgsService.list();

    const leverIdsFromResponse = [
      ...new Set(
        [...(response.data.primary_levers ?? []), ...(response.data.contributor_levers ?? [])]
          .map(lever => lever.lever_id)
          .filter(leverId => leverId != null && leverId !== '')
      )
    ];

    if (leverIdsFromResponse.length) {
      await Promise.all(leverIdsFromResponse.map(leverId => this.getLeverSdgTargetsService.main(leverId)));
    }

    const mapLevers = (levers: Lever[] | undefined): Lever[] =>
      (levers ?? []).map(lever => ({
        ...lever,
        result_lever_sdgs: enrichResultSdgs(lever.result_lever_sdgs, sdgsCatalog),
        result_lever_sdg_targets: enrichAlignmentSdgTargets(
          (lever as Lever & { result_lever_sdg_targets?: unknown }).result_lever_sdg_targets,
          this.getLeverSdgTargetsService.getList(lever.lever_id)()
        )
      }));

    let primary_levers = enrichAlignmentLevers(mapLevers(response.data.primary_levers), leversCatalog);
    let contributor_levers = enrichAlignmentLevers(mapLevers(response.data.contributor_levers), leversCatalog);

    const legacyRootSdgs = enrichResultSdgs(response.data.result_sdgs, sdgsCatalog);
    const anyLeverHasSdgs = [...primary_levers, ...contributor_levers].some(l => l.result_lever_sdgs != null && l.result_lever_sdgs.length > 0);

    if (this.isOicrIndicator() && legacyRootSdgs.length && !anyLeverHasSdgs) {
      const total = primary_levers.length + contributor_levers.length;
      if (total === 1) {
        if (primary_levers.length === 1) {
          primary_levers = [{ ...primary_levers[0], result_lever_sdgs: legacyRootSdgs }];
        } else if (contributor_levers.length === 1) {
          contributor_levers = [{ ...contributor_levers[0], result_lever_sdgs: legacyRootSdgs }];
        }
      }
    }

    this.populateLeverChildSignals([...primary_levers, ...contributor_levers]);

    this.body.set({
      contracts: enrichPortfolio2Contracts(response.data.contracts, contractsCatalog),
      result_sdgs: this.isOicrIndicator() ? [] : legacyRootSdgs,
      primary_levers: this.applyCustomNamesToLevers(primary_levers),
      contributor_levers: this.applyCustomNamesToLevers(contributor_levers),
      research_areas: response.data.research_areas || [],
      strategic_objectives: response.data.strategic_objectives || [],
      impact_outcomes: response.data.impact_outcomes || []
    });
  }

  private populateLeverChildSignals(levers: Lever[]) {
    for (const lever of levers) {
      this.leverOutcomeSignals.set(lever.lever_id, signal({ result_lever_strategic_outcomes: lever.result_lever_strategic_outcomes ?? [] }));
      this.leverSdgSignals.set(
        lever.lever_id,
        signal({
          result_lever_sdgs: lever.result_lever_sdgs ?? [],
          result_lever_sdg_targets: lever.result_lever_sdg_targets ?? []
        })
      );
    }

    this.syncLeverCustomNameSignals(levers);
  }

  private syncLeverCustomNameSignals(levers: Lever[]): void {
    const activeOtherIds = new Set(levers.filter(lever => this.isOtherLever(lever)).map(lever => lever.lever_id));

    for (const leverId of this.leverCustomNameSignals.keys()) {
      if (!activeOtherIds.has(leverId)) {
        this.leverCustomNameSignals.delete(leverId);
      }
    }

    for (const lever of levers) {
      if (!this.isOtherLever(lever)) {
        continue;
      }

      const apiValue = (lever.custom_lever_name ?? '').trim();
      const existing = this.leverCustomNameSignals.get(lever.lever_id);
      if (!existing) {
        this.leverCustomNameSignals.set(lever.lever_id, signal({ custom_lever_name: apiValue }));
        continue;
      }

      const current = (existing().custom_lever_name ?? '').trim();
      const nextValue = apiValue || current;
      if (existing().custom_lever_name !== nextValue) {
        existing.set({ custom_lever_name: nextValue });
      }
    }
  }

  private applyCustomNamesToLevers(levers: Lever[]): Lever[] {
    return levers.map(lever => {
      if (!this.isOtherLever(lever)) {
        return lever;
      }

      const customNameSignal = this.leverCustomNameSignals.get(lever.lever_id);
      const custom_lever_name = customNameSignal?.().custom_lever_name ?? lever.custom_lever_name ?? '';
      return { ...lever, custom_lever_name };
    });
  }

  optionsDisabled: WritableSignal<Lever[]> = signal([]);
  primaryOptionsDisabled: WritableSignal<Lever[]> = signal([]);

  getPrimaryLeversForOptions(): Lever[] {
    return this.body().primary_levers || [];
  }

  getContributorLeversForOptions(): Lever[] {
    return this.body().contributor_levers || [];
  }

  parseResultLeverSdgTargetEntry(x: unknown): ResultLeverSdgTargetPayload | null {
    if (typeof x === 'number' && Number.isFinite(x)) {
      return { sdg_target_id: x };
    }
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    const id = o['sdg_target_id'] ?? o['id'];
    let n = Number.NaN;
    if (typeof id === 'number') n = id;
    else if (typeof id === 'string' && id !== '') n = Number(id);
    if (!Number.isFinite(n) || n <= 0) return null;
    return { sdg_target_id: n };
  }

  normalizeResultLeverSdgTargets(raw: unknown): AlignmentSdgTargetRow[] {
    if (!Array.isArray(raw)) return [];
    const out: AlignmentSdgTargetRow[] = [];
    for (const x of raw) {
      const parsed = this.parseResultLeverSdgTargetEntry(x);
      if (!parsed) continue;
      out.push(x && typeof x === 'object' ? { ...(x as AlignmentSdgTargetRow), ...parsed } : parsed);
    }
    return out;
  }

  updateOptionsDisabledEffect = effect(
    () => {
      this.optionsDisabled.set(this.getPrimaryLeversForOptions());
    },
    { allowSignalWrites: true }
  );

  updatePrimaryOptionsDisabledEffect = effect(
    () => {
      const contributor = this.getContributorLeversForOptions();
      this.primaryOptionsDisabled.set(contributor);
    },
    { allowSignalWrites: true }
  );

  canRemove = (): boolean => {
    return this.submission.isEditableStatus();
  };

  async saveData(page?: 'next' | 'back') {
    this.loading.set(true);

    const numericResultId = this.cache.getCurrentNumericResultId();
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;

    const navigateTo = (path: string) => {
      this.router.navigate(['result', this.cache.currentResultId(), path], {
        queryParams,
        replaceUrl: true
      });
    };

    const nextPath = this.cache.currentResultIndicatorSectionPath();

    if (this.submission.isEditableStatus()) {
      if (this.isPortfolioP2Alignment()) {
        await this.savePortfolioP2Alignment(numericResultId);
      } else {
        await this.saveDefaultAlignment(numericResultId);
      }
    }
    if (page === 'back') navigateTo('general-information');
    else if (page === 'next') navigateTo(nextPath);
    this.loading.set(false);
  }

  private async savePortfolioP2Alignment(numericResultId: number): Promise<void> {
    const dataToSend = buildPortfolio2AlignmentPatch(
      this.body(),
      this.isOicrIndicator() || this.isPolicyChangeIndicator(),
      !this.isOicrIndicator()
    );
    await this.patchAlignmentAndReload(numericResultId, dataToSend);
  }

  private async saveDefaultAlignment(numericResultId: number): Promise<void> {
    const primary_levers = this.body().primary_levers.map(l => this.mergeLeverForSave(l));
    const contributor_levers = this.body().contributor_levers.map(l => this.mergeLeverForSave(l));

    const result_sdgs = this.isOicrIndicator()
      ? this.buildResultSdgsFromLevers([...primary_levers, ...contributor_levers], numericResultId)
      : this.buildResultSdgsFromSelection(this.body().result_sdgs ?? [], numericResultId);

    const dataToSend = {
      ...this.body(),
      primary_levers,
      contributor_levers,
      result_sdgs
    };

    await this.patchAlignmentAndReload(numericResultId, dataToSend);
  }

  private async patchAlignmentAndReload(numericResultId: number, dataToSend: unknown): Promise<void> {
    const response = await this.apiService.PATCH_Alignments(numericResultId, dataToSend, this.alignmentRequestParams());
    if (!response.successfulRequest) {
      return;
    }

    this.actions.showToast({
      severity: 'success',
      summary: 'Alliance Alignment',
      detail: 'Data saved successfully'
    });

    await this.getData();
  }

  private buildResultSdgsFromLevers(levers: Lever[], resultId: number) {
    const sdgByKey = new Map<number, GetSdgs>();
    for (const lever of levers) {
      for (const sdg of lever.result_lever_sdgs ?? []) {
        const id = sdg.id ?? (sdg as GetSdgs & { sdg_id?: number }).sdg_id ?? sdg.clarisa_sdg_id;
        if (id != null) sdgByKey.set(Number(id), sdg);
      }
    }

    return this.buildResultSdgsFromSelection([...sdgByKey.values()], resultId);
  }

  private buildResultSdgsFromSelection(sdgs: GetSdgs[], resultId: number) {
    return sdgs.map(sdg => ({
      created_at: sdg.created_at,
      is_active: sdg.is_active,
      updated_at: sdg.updated_at,
      clarisa_sdg_id: sdg.id ?? sdg.clarisa_sdg_id,
      result_id: resultId
    }));
  }

  markAsPrimary(
    item: { is_primary: boolean; contract_id?: string | number; lever_id?: string | number; sdg_id?: number },
    type: 'contract' | 'lever' | 'sdg'
  ) {
    this.body.update(current => {
      if (type === 'contract') {
        const contracts = current.contracts.map(contract => {
          const isTargetContract = contract.contract_id === item.contract_id;
          return {
            ...contract,
            is_primary: isTargetContract ? !contract.is_primary : false
          };
        });
        return { ...current, contracts };
      } else if (type === 'lever') {
        const updatedPrimaryLevers = current.primary_levers.map(lever => {
          const isTargetLever = lever.lever_id === item.lever_id;
          return {
            ...lever,
            is_primary: isTargetLever ? !lever.is_primary : false
          };
        });
        return { ...current, primary_levers: updatedPrimaryLevers };
      } else if (type === 'sdg') {
        const updatedResultSdgs = current.result_sdgs.map(sdg => {
          const sdgWithId = sdg as GetSdgs & { sdg_id?: number; is_primary?: boolean };
          const isTargetSdg = sdgWithId.sdg_id === item.sdg_id;
          return {
            ...sdg,
            is_primary: isTargetSdg ? !sdgWithId.is_primary : false
          } as GetSdgs & { sdg_id: number; is_primary: boolean };
        });
        return { ...current, result_sdgs: updatedResultSdgs };
      }
      return current;
    });
    this.actions.saveCurrentSection();
  }

  markAsPrimaryHandler = (
    item: { is_primary: boolean; contract_id?: string | number; lever_id?: string | number; sdg_id?: number },
    type: 'contract' | 'lever' | 'sdg'
  ) => this.markAsPrimary(item, type);

  removePrimaryLever(lever: Lever) {
    if (!this.submission.isEditableStatus()) return;
    this.leverOutcomeSignals.delete(lever.lever_id);
    this.leverSdgSignals.delete(lever.lever_id);
    this.leverCustomNameSignals.delete(lever.lever_id);
    this.body.update(current => ({
      ...current,
      primary_levers: current.primary_levers.filter(l => l.lever_id !== lever.lever_id)
    }));
    this.actions.saveCurrentSection();
  }

  removeContributorLever(lever: Lever) {
    if (!this.submission.isEditableStatus()) return;
    this.leverOutcomeSignals.delete(lever.lever_id);
    this.leverSdgSignals.delete(lever.lever_id);
    this.leverCustomNameSignals.delete(lever.lever_id);
    this.body.update(current => ({
      ...current,
      contributor_levers: current.contributor_levers.filter(l => l.lever_id !== lever.lever_id)
    }));
    this.actions.saveCurrentSection();
  }

  getShortDescription = (description: string): string => {
    let max: number;
    if (this.containerWidth < 900) {
      max = 73;
    } else if (this.containerWidth < 1100) {
      max = 105;
    } else if (this.containerWidth < 1240) {
      max = 135;
    } else {
      max = 155;
    }
    return description.length > max ? description.slice(0, max) + '...' : description;
  };

  getLeverName(leverId: string | number): string {
    if (Number(leverId) === OTHER_LEVER_ID) return 'Other';
    return `Lever ${leverId}`;
  }

  getLeverSignal(lever: Lever) {
    let s = this.leverOutcomeSignals.get(lever.lever_id);
    if (!s) {
      s = signal<{ result_lever_strategic_outcomes: LeverStrategicOutcome[] }>({
        result_lever_strategic_outcomes: lever.result_lever_strategic_outcomes || []
      });
      this.leverOutcomeSignals.set(lever.lever_id, s);
    }
    return s;
  }

  getLeverSdgSignal(lever: Lever) {
    let s = this.leverSdgSignals.get(lever.lever_id);
    if (!s) {
      s = signal({
        result_lever_sdgs: lever.result_lever_sdgs || [],
        result_lever_sdg_targets: lever.result_lever_sdg_targets || []
      });
      this.leverSdgSignals.set(lever.lever_id, s);
    }
    return s;
  }

  isOtherLever(lever: Lever): boolean {
    return Number(lever.lever_id) === OTHER_LEVER_ID;
  }

  private normalizeOutcome(value: unknown): LeverStrategicOutcome {
    if (typeof value === 'number') {
      return { lever_strategic_outcome_id: value };
    }
    if (value && typeof value === 'object') {
      const obj = value as Partial<LeverStrategicOutcome> & { id?: number };
      const idFromObject = obj.lever_strategic_outcome_id ?? obj.id;
      return { ...(obj as LeverStrategicOutcome), lever_strategic_outcome_id: idFromObject as number };
    }
    return { lever_strategic_outcome_id: 0 };
  }

  private mergeLeverForSave(lever: Lever): Lever {
    let next: Lever = { ...lever };

    const outSig = this.leverOutcomeSignals.get(lever.lever_id);
    if (outSig) {
      const raw: unknown = outSig().result_lever_strategic_outcomes as unknown;
      let normalized: LeverStrategicOutcome[] = [];
      if (Array.isArray(raw)) {
        normalized = (raw as unknown[]).map(value => this.normalizeOutcome(value));
      } else if (typeof raw === 'number' || (raw && typeof raw === 'object')) {
        normalized = [this.normalizeOutcome(raw)];
      }
      next = { ...next, result_lever_strategic_outcomes: normalized };
    }

    const sdgSig = this.leverSdgSignals.get(lever.lever_id);
    if (sdgSig) {
      const sig = sdgSig();
      const targets = (sig.result_lever_sdg_targets ?? [])
        .map(t => ({ sdg_target_id: t.sdg_target_id }))
        .filter(t => Number.isFinite(t.sdg_target_id) && t.sdg_target_id > 0);
      next = { ...next, result_lever_sdg_targets: targets, result_lever_sdgs: [] };
    }

    const customNameSig = this.leverCustomNameSignals.get(lever.lever_id);
    if (this.isOtherLever(lever)) {
      const custom_lever_name = (customNameSig?.().custom_lever_name ?? lever.custom_lever_name ?? '').trim();
      next = { ...next, custom_lever_name };
    } else if ('custom_lever_name' in next) {
      next = { ...next, custom_lever_name: undefined };
    }

    return next;
  }

  private getCurrentPortfolioId(): number | null {
    const metadata = this.cache.currentMetadata() as
      | {
          portfolio_id?: number;
          portfolioId?: number;
          portafolio_id?: number;
          portfolio?: { id?: number };
        }
      | undefined;
    const portfolioId = Number(metadata?.portfolio_id ?? metadata?.portfolioId ?? metadata?.portafolio_id ?? metadata?.portfolio?.id);
    return Number.isFinite(portfolioId) ? portfolioId : null;
  }

  getLeverCustomNameSignal(lever: Lever) {
    let s = this.leverCustomNameSignals.get(lever.lever_id);
    if (!s) {
      s = signal({ custom_lever_name: lever.custom_lever_name ?? '' });
      this.leverCustomNameSignals.set(lever.lever_id, s);
    }
    return s;
  }
}
